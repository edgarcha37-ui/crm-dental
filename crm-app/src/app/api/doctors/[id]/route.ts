import { NextRequest, NextResponse } from 'next/server';
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/doctors/[id]:', e);
    return NextResponse.json({ error: 'Error al actualizar doctor' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseId(id);
    if (!docId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    await deleteDoctor(docId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/doctors/[id]:', e);
    return NextResponse.json({ error: 'Error al eliminar doctor' }, { status: 500 });
  }
}
