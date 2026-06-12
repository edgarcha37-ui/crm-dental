import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createAbonoSchema, zodErrorResponse } from '@/schemas';
import { todayDateOnly } from '@/lib/dates';

/**
 * POST /api/abonos
 * Transacción lógica en Supabase:
 * 1. Lee el tratamiento actual y valida monto
 * 2. Actualiza monto_pagado en el tratamiento (y estatus si ya está cubierto)
 * 3. Inserta registro en invoices tipo='abono', estatus='Pagada' (aparece en /billing)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createAbonoSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const { tratamiento_id, paciente_id, monto, concepto } = parsed.data;

        const db = getSupabaseAdmin();

        const { data: treatment, error: readErr } = await db
            .from('treatments')
            .select('id, costo_total, monto_pagado, estatus')
            .eq('id', tratamiento_id)
            .single();

        if (readErr || !treatment) {
            return NextResponse.json({ error: 'Tratamiento no encontrado' }, { status: 404 });
        }

        const nuevoMontoPagado = (treatment.monto_pagado || 0) + monto;
        const nuevoEstatus = nuevoMontoPagado >= treatment.costo_total ? 'Completado' : treatment.estatus;
        // todayDateOnly usa hora local (TZ del server = CDMX); toISOString daría la fecha UTC.
        const today = todayDateOnly();
        const conceptoTexto = concepto || 'Abono a tratamiento';

        const { error: updateErr } = await db
            .from('treatments')
            .update({ monto_pagado: nuevoMontoPagado, estatus: nuevoEstatus })
            .eq('id', tratamiento_id);

        if (updateErr) {
            logApiError('abono update treatment', updateErr);
            return NextResponse.json({ error: 'Error al actualizar tratamiento' }, { status: 500 });
        }

        const { data: invoice, error: invoiceErr } = await db
            .from('invoices')
            .insert({
                paciente_id,
                tratamiento_id,
                monto,
                fecha: today,
                concepto: conceptoTexto,
                tipo: 'abono',
                estatus: 'Pagada',
                numero_factura: `ABONO-${Date.now()}`,
            })
            .select()
            .single();

        if (invoiceErr) {
            logApiError('abono insert invoice', invoiceErr);
            return NextResponse.json({ error: 'Error al registrar la factura' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            invoice_id: invoice.id,
            nuevo_monto_pagado: nuevoMontoPagado,
            nuevo_estatus: nuevoEstatus,
            saldo_restante: Math.max(0, treatment.costo_total - nuevoMontoPagado),
        }, { status: 201 });
    } catch (err) {
        logApiError('POST /api/abonos', err);
        return NextResponse.json({ error: 'Error al procesar abono' }, { status: 500 });
    }
}
