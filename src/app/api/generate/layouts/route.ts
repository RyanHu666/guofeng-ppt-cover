import { taskManager, createSSEStream } from '@/lib/task-manager';
import { generateLayoutPrompts } from '@/lib/ai-service';
import type { StyleType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 排版方案生成接口
 * 注意：排版方案现在只返回元数据（id/name/description/prompt），
 *       示意图由前端用几何图形实时渲染，不消耗 AI 生图 API。
 *       这样既快又省，排版结构一目了然。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectName, style, primaryColor, subtitle, description } = body as {
      projectName: string;
      style: StyleType;
      primaryColor: string;
      subtitle?: string;
      description?: string;
      elements?: unknown[];
    };

    if (!projectName || !style) {
      return Response.json({ error: '参数不完整' }, { status: 400 });
    }

    const taskId = `layouts_${Date.now()}`;
    taskManager.createTask(taskId, 'layouts');

    const layoutInfo = generateLayoutPrompts(projectName, style, primaryColor, subtitle, description);
    const total = layoutInfo.length;

    const response = createSSEStream(taskId, () => {
      (async () => {
        try {
          const task = taskManager.getTask(taskId);
          const signal = task?.abortController.signal;

          // 逐版推送（模拟进度，让用户有感知）
          for (let i = 0; i < total; i++) {
            if (signal?.aborted) break;

            const layout = layoutInfo[i];
            // 每版短暂延迟，模拟生成节奏
            await new Promise<void>((resolve) => setTimeout(resolve, 400));

            if (signal?.aborted) break;

            const overallProgress = ((i + 1) / total) * 100;
            taskManager.updateProgress(taskId, {
              status: 'generating',
              progress: overallProgress,
              message: `方案${i + 1}已就绪 (${i + 1}/${total})`,
              currentIndex: i,
              totalCount: total,
              layoutId: layout.id,
              layoutName: layout.name,
              description: layout.description,
              thumbnailPrompt: layout.prompt,
            });
          }

          if (signal?.aborted) {
            taskManager.updateProgress(taskId, {
              status: 'cancelled',
              progress: 0,
              message: '已终止',
            });
          } else {
            taskManager.updateProgress(taskId, {
              status: 'succeeded',
              progress: 100,
              message: '全部方案生成完成',
              totalCount: total,
            });
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : '未知错误';
          taskManager.updateProgress(taskId, {
            status: 'failed',
            progress: 0,
            message: errMsg,
            error: errMsg,
          });
        }
      })();
    });

    return response;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '服务器内部错误';
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
