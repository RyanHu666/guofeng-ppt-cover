import { taskManager, createSSEStream } from '@/lib/task-manager';
import { generateElementImage } from '@/lib/ai-service';
import type { ElementItem, StyleType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { elements, style, primaryColor } = body as {
      elements: ElementItem[];
      style: StyleType;
      primaryColor: string;
    };

    if (!elements || elements.length === 0) {
      return Response.json({ error: '元素列表为空' }, { status: 400 });
    }

    const taskId = `batch_${Date.now()}`;
    taskManager.createTask(taskId, 'elements-batch');

    const response = createSSEStream(taskId, (sendEvent) => {
      (async () => {
        try {
          const task = taskManager.getTask(taskId);
          const signal = task?.abortController.signal;
          const total = elements.length;
          const results: Array<{ elementId: string; imageUrl?: string; error?: string }> = [];

          for (let i = 0; i < total; i++) {
            if (signal?.aborted) break;

            const element = elements[i];
            const baseProgress = (i / total) * 100;

            taskManager.updateProgress(taskId, {
              status: 'generating',
              progress: baseProgress + 2,
              message: `正在生成「${element.name}」... (${i + 1}/${total})`,
              currentIndex: i,
              totalCount: total,
            });

            try {
              const imageUrl = await generateElementImage(element, style, primaryColor, {
                signal,
                onProgress: (subProgress, message) => {
                  const stepSize = 100 / total;
                  const overallProgress = baseProgress + (subProgress / 100) * stepSize;
                  taskManager.updateProgress(taskId, {
                    status: 'generating',
                    progress: overallProgress,
                    message: `${message} (${i + 1}/${total})`,
                    currentIndex: i,
                    totalCount: total,
                  });
                },
              });

              if (signal?.aborted) break;

              results.push({ elementId: element.id, imageUrl });

              taskManager.updateProgress(taskId, {
                status: 'generating',
                progress: baseProgress + 100 / total,
                message: `「${element.name}」生成完成 (${i + 1}/${total})`,
                currentIndex: i,
                totalCount: total,
              });
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : '生成失败';
              results.push({ elementId: element.id, error: errMsg });
              // 单个元素失败不中断，继续下一个
            }
          }

          if (signal?.aborted) return;

          const resultData = { results };
          taskManager.updateProgress(taskId, {
            status: 'completed',
            progress: 100,
            message: `全部生成完成，共 ${total} 个元素`,
            currentIndex: total - 1,
            totalCount: total,
            result: resultData,
          });

          sendEvent('complete', { taskId, result: resultData });
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
    console.error('批量生成接口错误:', error);
    return Response.json({ error: '生成服务异常' }, { status: 500 });
  }
}
