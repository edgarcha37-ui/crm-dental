import { NextRequest, NextResponse } from 'next/server';
import { getPatientById, updatePatient, archivarPaciente, deletePatient } from '@/lib/data/patients';
import { getTreatmentsByPatient } from '@/lib/data/treatments';
import { getFilesByPatient } from '@/lib/data/files';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const patient = await getPatientById(Number(id));
    if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    const [treatments, files] = await Promise.all([
        getTreatmentsByPatient(Number(id)),
        getFilesByPatient(Number(id)),
    ]);
    return NextResponse.json({ patient, treatments, files });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json();
    if (body.accion === 'archivar') { await archivarPaciente(Number(id), true); return NextResponse.json({ success: true }); }
    if (body.accion === 'restaurar') { await archivarPaciente(Number(id), false); return NextResponse.json({ success: true }); }
    await updatePatient(Number(id), body);
    return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await deletePatient(Number(id));
    return NextResponse.json({ success: true });
}
