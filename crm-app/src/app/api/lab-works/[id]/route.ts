import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
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
    audit({ actor: getActorFromRequest(request), action: 'UPDATE', entity: 'lab_works', entity_id: lwId, diff: { after: parsed.data }, route: `PUT /api/lab-works/${lwId}`, ip: getIpFromRequest(request) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError('PUT /api/lab-works/[id]', e);
    return NextResponse.json({ error: 'Error al actualizar trabajo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lwId = parseId(id);
    if (!lwId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    await deleteLabWork(lwId);
    audit({ actor: getActorFromRequest(request), action: 'DELETE', entity: 'lab_works', entity_id: lwId, route: `DELETE /api/lab-works/${lwId}`, ip: getIpFromRequest(request) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError('DELETE /api/lab-works/[id]', e);
    return NextResponse.json({ error: 'Error al eliminar trabajo' }, { status: 500 });
  }
}
