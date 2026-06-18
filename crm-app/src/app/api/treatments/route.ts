import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
import { createTreatment, getTreatmentsByPatient } from '@/lib/data/treatments';
import { createTreatmentSchema, zodErrorResponse } from '@/schemas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pacienteId = Number(searchParams.get('paciente_id'));
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 });
  try {
    return NextResponse.json(await getTreatmentsByPatient(pacienteId));
  } catch (e) {
    logApiError('GET /api/treatments', e);
    return NextResponse.json({ error: 'Error al obtener tratamientos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createTreatmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const result = await createTreatment(parsed.data);
        audit({ actor: getActorFromRequest(request), action: 'INSERT', entity: 'treatments', entity_id: result.id, diff: { after: parsed.data }, route: 'POST /api/treatments', ip: getIpFromRequest(request) });
        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logApiError('POST /api/treatments', msg);
        return NextResponse.json({ error: 'Error al crear tratamiento' }, { status: 500 });
    }
}
