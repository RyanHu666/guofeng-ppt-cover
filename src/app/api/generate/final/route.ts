import { taskManager, createSSEStream } from '@/lib/task-manager';
import { generateFinalCover } from '@/lib/ai-service';
import type { StyleType, ColorItem, ElementItem } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectName,
      subtitle,
      description,
      style,
      primaryColor,
      layoutId,
      layoutName,
      strength = 0.65,
      styleKeywords = [],
      colorPalette = [],
      confirmedElements = [],
      referenceImages = [],
    } = body as {
      projectName: string;
      subtitle?: string;
      description?: string;
      style: StyleType;
      primaryColor: string;
      layoutId: string;
      layoutName: string;
      strength?: number;
      styleKeywords?: string[];
      colorPalette?: ColorItem[];
      confirmedElements?: ElementItem[];
      referenceImages?: string[];
    };

    if (!projectName) {
      return Response.json({ error: '项目名称不能为空' }, { status: 400 });
    }
    if (!layoutId) {
      return Response.json({ error: '请先选择排版方案' }, { status: 400 });
    }

    const taskId = `final_${Date.now()}`;
    taskManager.createTask(taskId, 'final');

    // 第一张参考图作为图生图输入
    const firstReference = referenceImages[0];

    const response = createSSEStream(taskId, (sendEvent) => {
      (async () => {
        try {
          const task = taskManager.getTask(taskId);
          const signal = task?.abortController.signal;

          taskManager.updateProgress(taskId, {
            status: 'generating',
            progress: 5,
            message: '正在生成背景意境图...',
          });

          // 生成纯背景意境图（不含文字），排版由前端代码叠加
          const imageUrl = await generateFinalCover(
            {
              projectName,
              subtitle,
              description,
              style,
              primaryColor,
              layoutId,
              layoutName,
              styleKeywords,
              colorPalette,
              confirmedElements,
              referenceImage: firstReference,
              strength,
            },
            {
              signal,
              onProgress: (progress, message) => {
                taskManager.updateProgress(taskId, {
                  status: 'generating',
                  progress,
                  message,
                });
              },
            },
          );

          if (signal?.aborted) return;

          const result = { imageUrl };
          taskManager.updateProgress(taskId, {
            status: 'completed',
            progress: 100,
            message: '封面生成完成！',
            result,
          });

          sendEvent('complete', { taskId, result });
          taskManager.removeTask(taskId);
        } catch (error) {
          if (taskManager.isCancelled(taskId)) return;

          const msg = error instanceof Error ? error.message : '未知错误';
          taskManager.updateProgress(taskId, {
            status: 'failed',
            progress: 0,
            message: msg,
          });
          sendEvent('error', { taskId, message: msg });
          taskManager.removeTask(taskId);
        }
      })();
    });

    return response;
  } catch (error) {
    console.error('封面生成接口错误:', error);
    return Response.json({ error: '生成服务异常' }, { status: 500 });
  }
}
