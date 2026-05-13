import { NextRequest, NextResponse } from 'next/server';
import { getInvoices, getInvoicesByPatient, createInvoice, getInvoiceStats } from '@/lib/data/invoices';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'Pagada' | 'Pendiente' | null;
    const stats = searchParams.get('stats');
    const pacienteId = searchParams.get('paciente_id');

    if (stats === 'true') return NextResponse.json(await getInvoiceStats());
    if (pacienteId) return NextResponse.json(await getInvoicesByPatient(Number(pacienteId)));
    return NextResponse.json(await getInvoices(filter || undefined));
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const result = await createInvoice(body);
    return NextResponse.json(result, { status: 201 });
}
