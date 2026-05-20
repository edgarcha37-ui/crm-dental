import { getSupabaseAdmin } from '../supabase';

export type ToothEstado = 'sano' | 'caries' | 'restauracion' | 'extraccion' | 'corona' | 'implante' | 'endodoncia' | 'ausente';

export interface ToothState {
  estado: ToothEstado;
  notas?: string;
  fecha?: string;
}

export interface Odontograma {
  paciente_id: number;
  dientes: Record<string, ToothState>;
  observaciones: string | null;
  updated_at?: string;
}

export async function getOdontograma(pacienteId: number): Promise<Odontograma> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('odontograma')
    .select('*')
    .eq('paciente_id', pacienteId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { paciente_id: pacienteId, dientes: {}, observaciones: null };
  return data as Odontograma;
}

export async function upsertOdontograma(pacienteId: number, data: { dientes?: Record<string, ToothState>; observaciones?: string | null }): Promise<void> {
  const db = getSupabaseAdmin();
  const payload: Record<string, unknown> = {
    paciente_id: pacienteId,
    updated_at: new Date().toISOString(),
  };
  if (data.dientes !== undefined) payload.dientes = data.dientes;
  if (data.observaciones !== undefined) payload.observaciones = data.observaciones;
  const { error } = await db.from('odontograma').upsert(payload, { onConflict: 'paciente_id' });
  if (error) throw error;
}
