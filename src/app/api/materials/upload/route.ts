import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { addMaterial } from '@/lib/material-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('category') as string) || 'other';
    const tagsStr = (formData.get('tags') as string) || '';
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '请选择要上传的图片' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'materials');
    await mkdir(uploadDir, { recursive: true });

    const results = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = getExt(file.name, file.type);
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const relPath = `materials/${filename}`;
      const fullPath = path.join(process.cwd(), 'public', relPath);

      await writeFile(fullPath, buffer);

      // 用 canvas 读尺寸太重量级，简单设 0，前端会按比例显示
      const item = await addMaterial({
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        thumbUrl: `/${relPath}`,
        midUrl: `/${relPath}`,
        originalUrl: `/${relPath}`,
        localPath: relPath,
        width: 0,
        height: 0,
        source: 'upload',
        category,
        tags,
      });

      results.push(item);
    }

    return NextResponse.json({ items: results, count: results.length });
  } catch (error: any) {
    console.error('[materials/upload] error:', error.message);
    return NextResponse.json({ error: `上传失败: ${error.message}` }, { status: 500 });
  }
}

function getExt(filename: string, mimeType: string): string {
  const fromName = filename.split('.').pop()?.toLowerCase();
  if (fromName && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  // 从 mime 推断
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] || 'png';
}
