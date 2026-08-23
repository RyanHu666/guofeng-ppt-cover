import { NextResponse } from 'next/server';
import { searchImages } from '@/lib/image-search';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyword, page = 1, perPage = 20 } = body;

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ items: [], total: 0, source: 'none', keyword: '' });
    }

    const result = await searchImages(keyword, page, perPage);

    // 统一字段名，与前端 MaterialItem 对齐
    const items = (result?.items || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.title,
      thumbUrl: item.thumbnailUrl,
      midUrl: item.imageUrl,
      originalUrl: item.imageUrl,
      sourceUrl: item.sourceUrl,
      source: item.source as any,
      category: 'other',
      tags: item.title.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      width: item.width,
      height: item.height,
    }));

    return NextResponse.json({
      items,
      total: result?.total || 0,
      source: result?.source || 'none',
      keyword: result?.keyword || keyword,
      page: result?.page || page,
    });
  } catch (error) {
    console.error('素材搜索失败:', error);
    return NextResponse.json(
      { error: '搜索失败，请稍后重试', items: [], total: 0 },
      { status: 500 },
    );
  }
}
