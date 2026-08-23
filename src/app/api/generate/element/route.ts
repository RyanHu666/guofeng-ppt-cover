import { taskManager, createSSEStream } from '@/lib/task-manager';
import { generateElementImage } from '@/lib/ai-service';
import type { ElementItem, StyleType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { element, style, primaryColor } = body as {
      element: ElementItem;
      style: StyleType;
      primaryColor: string;
    };

    if (!element || !element.name) {
      return Response.json({ error: '元素信息不完整' }, { status: 400 });
    }

    const taskId = `elem_${Date.now()}_${element.id || ''}`;
    taskManager.createTask(taskId, 'element');

    const response = createSSEStream(taskId, (sendEvent) => {
      (async () => {
        try {
          const task = taskManager.getTask(taskId);
          const signal = task?.abortController.signal;

          taskManager.updateProgress(taskId, {
            status: 'generating',
            progress: 5,
            message: `正在生成「${element.name}」...`,
            elementId: element.id,
          });

          const imageUrl = await generateElementImage(element, style, primaryColor, {
            signal,
            onProgress: (progress, message) => {
              taskManager.updateProgress(taskId, {
                status: 'generating',
                progress,
                message,
                elementId: element.id,
              });
            },
          });

          if (signal?.aborted) return;

          const result = { elementId: element.id, imageUrl };
          taskManager.updateProgress(taskId, {
            status: 'completed',
            progress: 100,
            message: '生成完成',
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
    console.error('元素生成接口错误:', error);
    return Response.json({ error: '生成服务异常' }, { status: 500 });
  }
}
