import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { audit, getActorFromRequest, getIpFromRequest } from '@/lib/audit';
import { requireRole } from '@/lib/require-role';
import { getPatientById, updatePatient, archivarPaciente, deletePatient } from '@/lib/data/patients';
import { getTreatmentsByPatient } from '@/lib/data/treatments';
import { updatePatientSchema, zodErrorResponse } from '@/schemas';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const patientId = Number(id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    const patient = await getPatientById(patientId);
    if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    const treatments = await getTreatmentsByPatient(patientId);
    return NextResponse.json({ patient, treatments });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const patientId = Number(id);
        if (!Number.isInteger(patientId) || patientId <= 0) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }
        const body = await request.json();
        const parsed = updatePatientSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const data = parsed.data;
        const actor = getActorFromRequest(request);
        const ip = getIpFromRequest(request);
        if (data.accion === 'archivar') {
            await archivarPaciente(patientId, true);
            audit({ actor, action: 'UPDATE', entity: 'patients', entity_id: patientId, diff: { after: { archivado: true } }, route: 'PUT /api/patients/[id]', ip });
            return NextResponse.json({ success: true });
        }
        if (data.accion === 'restaurar') {
            await archivarPaciente(patientId, false);
            audit({ actor, action: 'UPDATE', entity: 'patients', entity_id: patientId, diff: { after: { archivado: false } }, route: 'PUT /api/patients/[id]', ip });
            return NextResponse.json({ success: true });
        }
        await updatePatient(patientId, data);
        audit({ actor, action: 'UPDATE', entity: 'patients', entity_id: patientId, diff: { after: data }, route: 'PUT /api/patients/[id]', ip });
        return NextResponse.json({ success: true });
    } catch (err) {
        logApiError('PUT /api/patients/[id]', err);
        return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const denied = await requireRole(request, ['admin']);
        if (denied) return denied;

        const { id } = await params;
        const patientId = Number(id);
        if (!Number.isInteger(patientId) || patientId <= 0) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }
        await deletePatient(patientId);
        audit({
            actor: getActorFromRequest(request),
            action: 'DELETE',
            entity: 'patients',
            entity_id: patientId,
            route: 'DELETE /api/patients/[id]',
            ip: getIpFromRequest(request),
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        logApiError('DELETE /api/patients/[id]', err);
        return NextResponse.json({ error: 'Error al eliminar paciente' }, { status: 500 });
    }
}
