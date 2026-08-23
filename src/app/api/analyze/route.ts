import { taskManager, createSSEStream } from '@/lib/task-manager';
import { analyzeReferenceImages } from '@/lib/ai-service';
import type { StyleType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referenceImages, style, primaryColor, projectName, subtitle, description } = body;

    if (!referenceImages || referenceImages.length === 0) {
      return Response.json({ error: '请至少上传一张参考图' }, { status: 400 });
    }

    const taskId = taskManager.generateId();
    taskManager.createTask(taskId, 'analyze');

    const response = createSSEStream(taskId, (sendEvent) => {
      // 异步执行分析
      (async () => {
        try {
          const { abortController } = taskManager.getTask(taskId) || {};
          const signal = abortController?.signal;

          taskManager.updateProgress(taskId, {
            status: 'generating',
            progress: 10,
            message: '正在上传参考图到AI服务...',
          });

          if (signal?.aborted) return;

          const result = await analyzeReferenceImages(
            referenceImages,
            style as StyleType,
            primaryColor,
            projectName || '',
            {
              subtitle: subtitle || '',
              description: description || '',
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

          taskManager.updateProgress(taskId, {
            status: 'completed',
            progress: 100,
            message: '分析完成',
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
    console.error('分析接口错误:', error);
    return Response.json({ error: '分析服务异常' }, { status: 500 });
  }
}
