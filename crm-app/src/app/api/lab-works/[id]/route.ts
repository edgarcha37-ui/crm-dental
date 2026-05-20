import { NextRequest, NextResponse } from 'next/server';
import { updateLabWork, deleteLabWork } from '@/lib/data/lab-works';
import { updateLabWorkSchema, zodErrorResponse } from '@/schemas';

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lwId = parseId(id);
    if (!lwId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const body = await request.json();
    const parsed = updateLabWorkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    await updateLabWork(lwId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/lab-works/[id]:', e);
    return NextResponse.json({ error: 'Error al actualizar trabajo' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lwId = parseId(id);
    if (!lwId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    await deleteLabWork(lwId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/lab-works/[id]:', e);
    return NextResponse.json({ error: 'Error al eliminar trabajo' }, { status: 500 });
  }
}
