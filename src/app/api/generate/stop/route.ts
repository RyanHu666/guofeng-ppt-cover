import { NextRequest, NextResponse } from 'next/server';
import { taskManager } from '@/lib/task-manager';

/**
 * POST /api/generate/stop - 终止生成任务
 * 请求体: { taskId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: '缺少任务ID' }, { status: 400 });
    }

    const success = taskManager.cancelTask(taskId);

    if (success) {
      return NextResponse.json({ success: true, message: '已发送终止信号' });
    } else {
      return NextResponse.json({ success: false, message: '任务不存在或已结束' }, { status: 404 });
    }
  } catch (error) {
    console.error('API generate/stop 错误:', error);
    return NextResponse.json(
      { error: (error as Error).message || '服务器错误' },
      { status: 500 },
    );
  }
}
