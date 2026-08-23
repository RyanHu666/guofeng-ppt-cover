import { NextRequest, NextResponse } from 'next/server';
import { deleteMaterial } from '@/lib/material-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '素材ID不能为空' }, { status: 400 });
    }

    const ok = await deleteMaterial(id);

    if (!ok) {
      return NextResponse.json({ error: '素材不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[materials/delete] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
