import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { addMaterial } from '@/lib/material-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 收藏花瓣网图片到本地素材库
// 下载原图到本地，记录元数据

export async function POST(request: NextRequest) {
  try {
    const {
      sourceUrl,
      originalUrl,
      thumbUrl,
      midUrl,
      title,
      description,
      category = 'other',
      tags = [],
      width,
      height,
      source = 'huaban',
    } = await request.json();

    if (!originalUrl && !midUrl && !thumbUrl) {
      return NextResponse.json({ error: '图片地址不能为空' }, { status: 400 });
    }

    const downloadUrl = originalUrl || midUrl || thumbUrl;

    // 下载图片
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(downloadUrl, {
        headers: {
          Referer: 'https://huaban.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `下载失败: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // 从 URL 或 content-type 推断扩展名
    let ext = 'png';
    const urlPath = new URL(downloadUrl).pathname;
    const urlExt = urlPath.split('.').pop()?.toLowerCase();
    if (urlExt && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(urlExt)) {
      ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
    } else {
      const ct = response.headers.get('content-type') || '';
      const map: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
      };
      ext = map[ct] || 'png';
    }

    // 保存到本地
    const saveDir = path.join(process.cwd(), 'public', 'materials');
    await mkdir(saveDir, { recursive: true });

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const relPath = `materials/${filename}`;
    const fullPath = path.join(process.cwd(), 'public', relPath);

    await writeFile(fullPath, buffer);

    const item = await addMaterial({
      title: title || '收藏素材',
      description: description || '',
      thumbUrl: `/${relPath}`,
      midUrl: `/${relPath}`,
      originalUrl: `/${relPath}`,
      sourceUrl,
      localPath: relPath,
      width: width || 0,
      height: height || 0,
      source,
      category,
      tags: Array.isArray(tags) ? tags : [],
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('[materials/save] error:', error.message);
    return NextResponse.json(
      {
        error:
          error.name === 'AbortError'
            ? '下载超时'
            : `收藏失败: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
