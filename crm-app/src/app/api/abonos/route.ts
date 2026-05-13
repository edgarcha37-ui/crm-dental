import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/abonos
 * Transacción lógica en Supabase:
 * 1. Lee el tratamiento actual para validar monto y calcular nuevo total pagado
 * 2. Actualiza monto_pagado en el tratamiento (y estatus si ya está cubierto)
 * 3. Inserta registro en invoices tipo='abono', estatus='Pagada'
 *    → aparece como ingreso del mes en billing y métricas
 */
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { tratamiento_id, paciente_id, monto, concepto } = body as {
        tratamiento_id: number;
        paciente_id: number;
        monto: number;
        concepto?: string;
    };

    if (!tratamiento_id || !paciente_id || !monto || monto <= 0) {
        return NextResponse.json({ error: 'tratamiento_id, paciente_id y monto son requeridos' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // 1. Leer tratamiento actual
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
    const today = new Date().toISOString().split('T')[0];
    const conceptoTexto = concepto || `Abono a tratamiento`;

    // 2. Actualizar tratamiento
    const { error: updateErr } = await db
        .from('treatments')
        .update({ monto_pagado: nuevoMontoPagado, estatus: nuevoEstatus })
        .eq('id', tratamiento_id);

    if (updateErr) {
        return NextResponse.json({ error: 'Error al actualizar tratamiento' }, { status: 500 });
    }

    // 3. Registrar el abono como ingreso en invoices
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
        return NextResponse.json({ error: 'Error al registrar la factura' }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        invoice_id: invoice.id,
        nuevo_monto_pagado: nuevoMontoPagado,
        nuevo_estatus: nuevoEstatus,
        saldo_restante: Math.max(0, treatment.costo_total - nuevoMontoPagado),
    }, { status: 201 });
}
