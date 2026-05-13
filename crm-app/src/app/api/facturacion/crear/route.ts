import { NextRequest, NextResponse } from 'next/server';
import { getDatosFiscales, createFactura } from '@/lib/data/facturacion';
import { getPatientById } from '@/lib/data/patients';

// Variable de entorno: N8N_INVOICE_WEBHOOK_URL
// Si existe, envía el payload a n8n. Si no, retorna log.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paciente_id, tratamiento_id, monto_total, concepto } = body;

    if (!paciente_id || !monto_total) {
      return NextResponse.json({ error: 'paciente_id y monto_total son requeridos' }, { status: 400 });
    }

    // Obtener datos del paciente y fiscales
    const [paciente, datosFiscales] = await Promise.all([
      getPatientById(Number(paciente_id)),
      getDatosFiscales(Number(paciente_id)),
    ]);

    if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    if (!datosFiscales) return NextResponse.json({ error: 'El paciente no tiene datos fiscales configurados' }, { status: 422 });

    // Crear registro de factura en BD con status pendiente
    const factura = await createFactura({
      paciente_id: Number(paciente_id),
      tratamiento_id: tratamiento_id ? Number(tratamiento_id) : undefined,
      monto_total: Number(monto_total),
      status: 'pendiente',
      concepto: concepto || 'Servicios dentales',
    });

    // Construir payload limpio para n8n
    const payload = {
      factura_id: factura.id,
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        telefono: paciente.telefono,
        correo: paciente.correo,
      },
      datos_fiscales: datosFiscales,
      factura: {
        monto_total: Number(monto_total),
        concepto: concepto || 'Servicios dentales',
        tratamiento_id: tratamiento_id || null,
        fecha_emision: new Date().toISOString(),
      },
    };

    const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('[facturacion/crear] Webhook no configurado. Payload listo:', JSON.stringify(payload, null, 2));
      return NextResponse.json({ success: true, factura_id: factura.id, webhook: 'no_configurado', payload });
    }

    // Enviar a n8n
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      console.error('[facturacion/crear] Error en webhook n8n:', errText);
      return NextResponse.json({ success: false, factura_id: factura.id, error: 'Webhook respondió con error', detail: errText }, { status: 502 });
    }

    return NextResponse.json({ success: true, factura_id: factura.id, webhook: 'enviado' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[facturacion/crear]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
