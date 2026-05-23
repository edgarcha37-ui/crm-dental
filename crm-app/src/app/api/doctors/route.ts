import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
import { requireRole } from '@/lib/require-role';
import { getDoctors, createDoctor } from '@/lib/data/doctors';
import { createDoctorSchema, zodErrorResponse } from '@/schemas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const incluirInactivos = searchParams.get('incluir_inactivos') === 'true';
  try {
    const data = await getDoctors(!incluirInactivos);
    return NextResponse.json(data);
  } catch (e) {
    logApiError('GET /api/doctors', e);
    return NextResponse.json({ error: 'Error al obtener doctores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireRole(request, ['admin']);
    if (denied) return denied;

    const body = await request.json();
    const parsed = createDoctorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    const result = await createDoctor(parsed.data);
    audit({
      actor: getActorFromRequest(request),
      action: 'INSERT',
      entity: 'doctors',
      entity_id: result.id,
      diff: { after: parsed.data },
      route: 'POST /api/doctors',
      ip: getIpFromRequest(request),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    logApiError('POST /api/doctors', e);
    return NextResponse.json({ error: 'Error al crear doctor' }, { status: 500 });
  }
}
