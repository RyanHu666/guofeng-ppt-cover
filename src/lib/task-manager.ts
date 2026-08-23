import type { GenerationProgress, GenerationStatus } from './types';

/**
 * 任务管理器 - 处理 SSE 进度推送和任务终止
 */

type ProgressListener = (progress: GenerationProgress) => void;

interface TaskState {
  progress: GenerationProgress;
  abortController: AbortController;
  listeners: Set<ProgressListener>;
}

class TaskManager {
  private tasks = new Map<string, TaskState>();

  /** 创建新任务 */
  createTask(
    taskId: string,
    type: GenerationProgress['type'],
  ): { abortController: AbortController; getTask: () => TaskState | undefined } {
    const abortController = new AbortController();
    const taskState: TaskState = {
      progress: {
        taskId,
        type,
        status: 'pending',
        progress: 0,
        message: '准备中...',
      },
      abortController,
      listeners: new Set(),
    };
    this.tasks.set(taskId, taskState);
    return {
      abortController,
      getTask: () => this.tasks.get(taskId),
    };
  }

  /** 更新任务进度 */
  updateProgress(
    taskId: string,
    updates: Partial<Omit<GenerationProgress, 'taskId' | 'type'>>,
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = {
      ...task.progress,
      ...updates,
    } as GenerationProgress;

    // 通知所有监听者
    task.listeners.forEach((listener) => {
      try {
        listener(task.progress);
      } catch {
        // 忽略发送错误
      }
    });
  }

  /** 添加进度监听 */
  addListener(taskId: string, listener: ProgressListener): () => void {
    const task = this.tasks.get(taskId);
    if (!task) return () => {};

    task.listeners.add(listener);
    // 立即推送当前状态
    try {
      listener(task.progress);
    } catch {
      // ignore
    }

    return () => {
      task.listeners.delete(listener);
    };
  }

  /** 获取任务状态 */
  getProgress(taskId: string): GenerationProgress | undefined {
    return this.tasks.get(taskId)?.progress;
  }

  /** 获取任务完整信息（含 abortController） */
  getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  /** 终止任务 */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.abortController.abort();
    this.updateProgress(taskId, {
      status: 'cancelled',
      message: '已终止生成',
    });
    return true;
  }

  /** 检查任务是否被取消 */
  isCancelled(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    return task?.abortController.signal.aborted ?? false;
  }

  /** 移除任务（完成/失败后清理） */
  removeTask(taskId: string): void {
    // 延迟清理，给 SSE 客户端一点时间接收最终状态
    setTimeout(() => {
      this.tasks.delete(taskId);
    }, 60000);
  }

  /** 生成唯一任务ID */
  generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const taskManager = new TaskManager();

/**
 * 创建 SSE 响应的工具函数
 */
export function createSSEStream(
  taskId: string,
  onConnect?: (send: (event: string, data: unknown) => void) => void,
): Response {
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // 发送初始连接确认
      sendEvent('connected', { taskId });

      // 注册监听器
      cleanup = taskManager.addListener(taskId, (progress) => {
        sendEvent('progress', progress);

        // 如果是终态，关闭连接
        if (
          progress.status === 'completed' ||
          progress.status === 'failed' ||
          progress.status === 'cancelled'
        ) {
          setTimeout(() => {
            try {
              controller.close();
            } catch {
              // ignore
            }
          }, 500);
        }
      });

      onConnect?.(sendEvent);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
