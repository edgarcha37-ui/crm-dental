import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
import { getAppointments, getAppointmentsByPatient, createAppointment, getTodayAppointmentCount } from '@/lib/data/appointments';
import { createAppointmentSchema, zodErrorResponse } from '@/schemas';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const countOnly = searchParams.get('count');
    const pacienteId = searchParams.get('paciente_id');

    try {
        if (countOnly === 'today') return NextResponse.json({ count: await getTodayAppointmentCount() });
        if (pacienteId) return NextResponse.json(await getAppointmentsByPatient(Number(pacienteId)));
        return NextResponse.json(await getAppointments(fecha || undefined));
    } catch (err) {
        logApiError('GET /api/appointments', err);
        return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createAppointmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const result = await createAppointment(parsed.data);
        audit({
            actor: getActorFromRequest(request),
            action: 'INSERT',
            entity: 'appointments',
            entity_id: result.id,
            diff: { after: parsed.data },
            route: 'POST /api/appointments',
            ip: getIpFromRequest(request),
        });
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        logApiError('POST /api/appointments', err);
        return NextResponse.json({ error: 'Error al crear cita' }, { status: 500 });
    }
}
