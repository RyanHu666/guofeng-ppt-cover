'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GenerationProgress } from '@/lib/types';

/**
 * SSE 连接 Hook - 用于接收服务器推送的进度更新
 */

interface UseSSEOptions {
  onProgress?: (progress: GenerationProgress) => void;
  onCompleted?: (data: unknown) => void;
  onError?: (error: string) => void;
  onCancelled?: () => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const taskIdRef = useRef<string>('');

  const connect = useCallback((url: string, body: Record<string, unknown>) => {
    // 关闭之前的连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 使用 fetch + ReadableStream 实现 SSE，支持 POST 请求体
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          options.onError?.(err.error || '请求失败');
          setIsConnected(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          options.onError?.('无法读取响应流');
          return;
        }

        setIsConnected(true);

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 解析 SSE 事件
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const eventStr of events) {
            const lines = eventStr.split('\n');
            let eventType = 'message';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr += line.slice(6);
              }
            }

            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (eventType === 'connected') {
                taskIdRef.current = data.taskId;
                setIsConnected(true);
              } else if (eventType === 'progress') {
                const prog = data as GenerationProgress;
                setProgress(prog);
                options.onProgress?.(prog);

                if (prog.status === 'completed') {
                  options.onCompleted?.(prog.data ?? prog.result);
                  setIsConnected(false);
                } else if (prog.status === 'failed') {
                  const errMsg =
                    typeof (prog as unknown as { error?: string }).error === 'string'
                      ? (prog as unknown as { error: string }).error
                      : prog.message;
                  options.onError?.(errMsg);
                  setIsConnected(false);
                } else if (prog.status === 'cancelled') {
                  options.onCancelled?.();
                  setIsConnected(false);
                }
              } else if (eventType === 'complete') {
                options.onCompleted?.(data.result ?? data);
                setIsConnected(false);
              } else if (eventType === 'error') {
                options.onError?.(data.message || data.error || '请求失败');
                setIsConnected(false);
              } else if (eventType === 'cancelled') {
                options.onCancelled?.();
                setIsConnected(false);
              }
            } catch (e) {
              console.error('SSE 解析错误:', e);
            }
          }
        }

        setIsConnected(false);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setIsConnected(false);
          return;
        }
        console.error('SSE 连接错误:', error);
        options.onError?.((error as Error).message);
        setIsConnected(false);
      }
    })();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [options]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const taskId = taskIdRef.current;

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    progress,
    isConnected,
    taskId,
    connect,
    disconnect,
  };
}

/**
 * 终止生成任务
 */
export async function stopGeneration(taskId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/generate/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    const data = await response.json();
    return data.success ?? false;
  } catch {
    return false;
  }
}
