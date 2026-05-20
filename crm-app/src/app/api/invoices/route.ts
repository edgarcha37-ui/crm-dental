import { NextRequest, NextResponse } from 'next/server';
import { getInvoices, getInvoicesByPatient, createInvoice, getInvoiceStats } from '@/lib/data/invoices';
import { createInvoiceSchema, zodErrorResponse } from '@/schemas';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'Pagada' | 'Pendiente' | null;
    const stats = searchParams.get('stats');
    const pacienteId = searchParams.get('paciente_id');

    try {
        if (stats === 'true') return NextResponse.json(await getInvoiceStats());
        if (pacienteId) return NextResponse.json(await getInvoicesByPatient(Number(pacienteId)));
        return NextResponse.json(await getInvoices(filter || undefined));
    } catch (err) {
        console.error('GET /api/invoices:', err);
        return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createInvoiceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const result = await createInvoice(parsed.data);
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error('POST /api/invoices:', err);
        return NextResponse.json({ error: 'Error al crear factura' }, { status: 500 });
    }
}
