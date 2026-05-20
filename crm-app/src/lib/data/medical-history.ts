import { getSupabaseAdmin } from '../supabase';

export interface MedicalHistory {
  paciente_id: number;
  alergias: string[];
  medicamentos_cronicos: string[];
  padecimientos: string[];
  tipo_sangre: string | null;
  notas_clinicas: string | null;
  updated_at?: string;
}

const EMPTY: Omit<MedicalHistory, 'paciente_id'> = {
  alergias: [],
  medicamentos_cronicos: [],
  padecimientos: [],
  tipo_sangre: null,
  notas_clinicas: null,
};

export async function getMedicalHistory(pacienteId: number): Promise<MedicalHistory> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('patient_medical_history')
    .select('*')
    .eq('paciente_id', pacienteId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { paciente_id: pacienteId, ...EMPTY };
  return data as MedicalHistory;
}

export async function upsertMedicalHistory(pacienteId: number, data: Partial<MedicalHistory>): Promise<void> {
  const db = getSupabaseAdmin();
  const payload: Record<string, unknown> = { paciente_id: pacienteId, updated_at: new Date().toISOString() };
  if (data.alergias !== undefined) payload.alergias = data.alergias;
  if (data.medicamentos_cronicos !== undefined) payload.medicamentos_cronicos = data.medicamentos_cronicos;
  if (data.padecimientos !== undefined) payload.padecimientos = data.padecimientos;
  if (data.tipo_sangre !== undefined) payload.tipo_sangre = data.tipo_sangre;
  if (data.notas_clinicas !== undefined) payload.notas_clinicas = data.notas_clinicas;
  const { error } = await db
    .from('patient_medical_history')
    .upsert(payload, { onConflict: 'paciente_id' });
  if (error) throw error;
}
