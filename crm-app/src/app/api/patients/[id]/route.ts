import { NextRequest, NextResponse } from 'next/server';
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
        if (data.accion === 'archivar') { await archivarPaciente(patientId, true); return NextResponse.json({ success: true }); }
        if (data.accion === 'restaurar') { await archivarPaciente(patientId, false); return NextResponse.json({ success: true }); }
        await updatePatient(patientId, data);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('PUT /api/patients/[id]:', err);
        return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const patientId = Number(id);
        if (!Number.isInteger(patientId) || patientId <= 0) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }
        await deletePatient(patientId);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/patients/[id]:', err);
        return NextResponse.json({ error: 'Error al eliminar paciente' }, { status: 500 });
    }
}
