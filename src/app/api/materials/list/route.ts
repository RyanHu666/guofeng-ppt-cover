import { NextRequest, NextResponse } from 'next/server';
import { getMaterials } from '@/lib/material-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const keyword = searchParams.get('keyword') || '';
    const limit = parseInt(searchParams.get('limit') || '40', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { items, total } = await getMaterials({ category, keyword, limit, offset });

    return NextResponse.json({ items, total, category, keyword, offset, limit });
  } catch (error: any) {
    console.error('[materials/list] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
