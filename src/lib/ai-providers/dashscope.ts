// DashScope (通义万相) 服务商
// 文档: https://help.aliyun.com/zh/dashscope/
// 文生图模型: wanx2.1-t2i-turbo（万相2.1快速版）/ wan2.6-t2i
// 多模态模型: qwen-vl-plus
// 调用方式: 异步任务（提交任务 → 轮询结果）
import type { AIProvider, ImageGenerateOptions, VisionAnalyzeOptions } from './types';

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

export class DashScopeProvider implements AIProvider {
  id = 'dashscope';
  name = '通义万相 (DashScope)';

  private apiKey: string;
  private imageModel = 'wanx2.1-t2i-turbo';
  private visionModel = 'qwen-vl-plus';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.DASHSCOPE_API_KEY || '';
    if (!key) {
      throw new Error('DASHSCOPE_API_KEY 未配置');
    }
    this.apiKey = key;
  }

  async generateImage(options: ImageGenerateOptions): Promise<string> {
    const { prompt, size = '1024*1024', referenceImage, strength = 0.6, signal, onProgress } = options;
    // DashScope 尺寸格式用 * 分隔，统一转换一下
    const dsSize = size.replace(/x/g, '*');

    onProgress?.(10, '提交生成任务...');

    // 第一步：提交任务
    const submitUrl = `${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`;

    const body: Record<string, unknown> = {
      model: this.imageModel,
      input: {
        prompt,
      },
      parameters: {
        size: dsSize,
        n: 1,
      },
    };

    // 图生图（参考图存在时）
    if (referenceImage && strength > 0) {
      // @ts-expect-error input object
      body.input.ref_image = referenceImage;
      // @ts-expect-error parameters object
      body.parameters.ref_strength = strength;
      // 图生图用另一个模型
      body.model = this.imageModel;
    }

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      throw new Error(`提交任务失败 (${submitResponse.status}): ${errText}`);
    }

    const submitData = await submitResponse.json() as {
      output?: { task_id?: string; task_status?: string };
      code?: string;
      message?: string;
    };

    const taskId = submitData?.output?.task_id;
    if (!taskId) {
      throw new Error(submitData?.message || '未获取到任务ID');
    }

    onProgress?.(25, '生成中...');

    // 第二步：轮询结果
    const taskUrl = `${DASHSCOPE_BASE}/tasks/${taskId}`;
    const maxWait = 120000; // 最多等2分钟
    const interval = 3000; // 每3秒轮询一次
    const startTime = Date.now();
    let lastProgress = 25;

    while (Date.now() - startTime < maxWait) {
      if (signal?.aborted) {
        throw new Error('任务已取消');
      }

      await new Promise((resolve) => setTimeout(resolve, interval));

      const taskResponse = await fetch(taskUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal,
      });

      if (!taskResponse.ok) {
        // 偶尔失败不终止，继续轮询
        continue;
      }

      const taskData = await taskResponse.json() as {
        output?: {
          task_status?: string;
          results?: Array<{ url?: string }>;
          message?: string;
        };
      };

      const status = taskData?.output?.task_status;

      if (status === 'SUCCEEDED') {
        const imageUrl = taskData?.output?.results?.[0]?.url;
        if (!imageUrl) {
          throw new Error('生成成功但未返回图片地址');
        }
        onProgress?.(100, '生成完成');
        return imageUrl;
      }

      if (status === 'FAILED') {
        const errMsg = taskData?.output?.message || '生成失败';
        throw new Error(errMsg);
      }

      // 进度平滑推进
      const elapsed = Date.now() - startTime;
      const progress = Math.min(95, 25 + Math.floor((elapsed / maxWait) * 70));
      if (progress > lastProgress) {
        lastProgress = progress;
        onProgress?.(progress, status === 'RUNNING' ? '生成中...' : '排队中...');
      }
    }

    throw new Error('生成超时，请重试');
  }

  async analyzeImages(options: VisionAnalyzeOptions): Promise<string> {
    const { images, prompt, signal, onProgress } = options;

    onProgress?.(15, '正在分析参考图...');

    // 兼容模式调用多模态
    const url = `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`;

    // 构造多模态消息
    const content: Array<Record<string, unknown>> = [];

    // 添加图片（最多 4 张）
    for (let i = 0; i < Math.min(images.length, 4); i++) {
      content.push({ type: 'image_url', image_url: { url: images[i] } });
    }
    content.push({ type: 'text', text: prompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [{ role: 'user', content }],
        max_tokens: 2000,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`分析失败 (${response.status}): ${errText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = data?.choices?.[0]?.message?.content || '';

    onProgress?.(100, '分析完成');
    return result;
  }
}
