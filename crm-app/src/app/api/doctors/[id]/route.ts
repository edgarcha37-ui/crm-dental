import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
import { getDoctorById, updateDoctor, deleteDoctor } from '@/lib/data/doctors';
import { updateDoctorSchema, zodErrorResponse } from '@/schemas';

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docId = parseId(id);
  if (!docId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  const doctor = await getDoctorById(docId);
  if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });
  return NextResponse.json(doctor);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseId(id);
    if (!docId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const body = await request.json();
    const parsed = updateDoctorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    await updateDoctor(docId, parsed.data);
    audit({
      actor: getActorFromRequest(request),
      action: 'UPDATE',
      entity: 'doctors',
      entity_id: docId,
      diff: { after: parsed.data },
      route: 'PUT /api/doctors/[id]',
      ip: getIpFromRequest(request),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError('PUT /api/doctors/[id]', e);
    return NextResponse.json({ error: 'Error al actualizar doctor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseId(id);
    if (!docId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    await deleteDoctor(docId);
    audit({
      actor: getActorFromRequest(request),
      action: 'DELETE',
      entity: 'doctors',
      entity_id: docId,
      route: 'DELETE /api/doctors/[id]',
      ip: getIpFromRequest(request),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError('DELETE /api/doctors/[id]', e);
    return NextResponse.json({ error: 'Error al eliminar doctor' }, { status: 500 });
  }
}
