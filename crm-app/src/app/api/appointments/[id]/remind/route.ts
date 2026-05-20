import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { triggerN8n } from '@/lib/n8n';

/**
 * POST /api/appointments/[id]/remind
 * Dispara un workflow de n8n para enviar un recordatorio WhatsApp ad-hoc
 * al paciente de la cita. Útil para mandar uno fuera del batch diario.
 *
 * El workflow se llama "recordatorio-cita-ondemand" en n8n; debe leer el
 * payload y mandar el mensaje.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const appointmentId = Number(id);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('appointments')
      .select('id, fecha, hora_inicio, motivo, paciente_id, patients(nombre, telefono)')
      .eq('id', appointmentId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const paciente = (data as unknown as { patients: { nombre: string; telefono: string } }).patients;
    if (!paciente?.telefono) {
      return NextResponse.json({ error: 'El paciente no tiene teléfono registrado' }, { status: 400 });
    }

    const result = await triggerN8n('recordatorio-cita-ondemand', {
      appointment_id: data.id,
      paciente_id: data.paciente_id,
      paciente_nombre: paciente.nombre,
      telefono: paciente.telefono,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      motivo: data.motivo,
    });

    if (!result.ok) {
      return NextResponse.json({
        error: 'No se pudo disparar el recordatorio (revisa n8n)',
        n8n_error: result.error,
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true, telefono: paciente.telefono });
  } catch (e) {
    console.error('POST /api/appointments/[id]/remind:', e);
    return NextResponse.json({ error: 'Error al enviar recordatorio' }, { status: 500 });
  }
}
