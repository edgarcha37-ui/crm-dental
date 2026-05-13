import { NextRequest, NextResponse } from 'next/server';
import { getAppointments, getAppointmentsByPatient, createAppointment, getTodayAppointmentCount } from '@/lib/data/appointments';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const countOnly = searchParams.get('count');
    const pacienteId = searchParams.get('paciente_id');

    if (countOnly === 'today') return NextResponse.json({ count: await getTodayAppointmentCount() });
    if (pacienteId) return NextResponse.json(await getAppointmentsByPatient(Number(pacienteId)));
    return NextResponse.json(await getAppointments(fecha || undefined));
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const result = await createAppointment(body);
    return NextResponse.json(result, { status: 201 });
}
