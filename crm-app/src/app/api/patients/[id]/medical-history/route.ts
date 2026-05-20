import { NextRequest, NextResponse } from 'next/server';
import { getMedicalHistory, upsertMedicalHistory } from '@/lib/data/medical-history';
import { updateMedicalHistorySchema, zodErrorResponse } from '@/schemas';

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pid = parseId(id);
    if (!pid) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const history = await getMedicalHistory(pid);
    return NextResponse.json(history);
  } catch (e) {
    console.error('GET medical-history:', e);
    return NextResponse.json({ error: 'Error al obtener historia clínica' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pid = parseId(id);
    if (!pid) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const body = await request.json();
    const parsed = updateMedicalHistorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    await upsertMedicalHistory(pid, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT medical-history:', e);
    return NextResponse.json({ error: 'Error al guardar historia clínica' }, { status: 500 });
  }
}
