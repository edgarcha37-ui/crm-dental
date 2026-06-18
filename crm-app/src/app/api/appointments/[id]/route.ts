import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
import { updateAppointment } from '@/lib/data/appointments';
import { updateAppointmentSchema, zodErrorResponse } from '@/schemas';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const appointmentId = Number(id);
    if (!appointmentId || appointmentId < 1) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = updateAppointmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }

        const db = getSupabaseAdmin();
        const { data: before } = await db.from('appointments').select('*').eq('id', appointmentId).single();
        if (!before) {
            return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
        }

        await updateAppointment(appointmentId, parsed.data);

        audit({
            actor: getActorFromRequest(request),
            action: 'UPDATE',
            entity: 'appointments',
            entity_id: appointmentId,
            diff: { before, after: parsed.data },
            route: `PUT /api/appointments/${appointmentId}`,
            ip: getIpFromRequest(request),
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        logApiError(`PUT /api/appointments/${id}`, err);
        return NextResponse.json({ error: 'Error al actualizar cita' }, { status: 500 });
    }
}
