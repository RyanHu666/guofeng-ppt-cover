import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/upload - 上传参考图片，返回 base64 数据URL
 * 支持 multipart/form-data
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    const results: Array<{ name: string; size: number; dataUrl: string }> = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      results.push({
        name: file.name,
        size: file.size,
        dataUrl,
      });
    }

    return NextResponse.json({
      success: true,
      images: results,
    });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '上传失败' },
      { status: 500 },
    );
  }
}
