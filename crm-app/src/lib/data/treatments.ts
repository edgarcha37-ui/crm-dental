import { getSupabaseAdmin } from '../supabase';

export interface Treatment {
  id: number;
  paciente_id: number;
  nombre_tratamiento: string;
  nombre?: string;         // alias devuelto por getTreatmentsByPatient
  estatus: string;
  costo_total: number;
  costo?: number;          // alias devuelto por getTreatmentsByPatient
  monto_pagado: number;
  plan_id?: number | null;
  created_at: string;
  updated_at: string;
}

export async function getTreatmentsByPatient(pacienteId: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('treatments')
    .select('id, paciente_id, nombre:nombre_tratamiento, estatus, costo:costo_total, monto_pagado, plan_id, created_at, updated_at')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTreatment(data: Partial<Treatment>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('treatments').insert({
    paciente_id: data.paciente_id,
    nombre_tratamiento: data.nombre_tratamiento || data.nombre,
    estatus: data.estatus || 'Pendiente',
    costo_total: data.costo_total ?? data.costo ?? 0,
    monto_pagado: data.monto_pagado ?? 0,
  }).select().single();
  if (error) throw error;
  return { id: result.id };
}

export async function updateTreatment(id: number, data: Partial<Treatment>) {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (data.nombre_tratamiento !== undefined) update.nombre_tratamiento = data.nombre_tratamiento;
  if (data.estatus !== undefined) update.estatus = data.estatus;
  if (data.costo_total !== undefined) update.costo_total = data.costo_total;
  if (data.monto_pagado !== undefined) update.monto_pagado = data.monto_pagado;
  if ('plan_id' in data) update.plan_id = data.plan_id ?? null;
  if (Object.keys(update).length === 0) return;
  const { error } = await db.from('treatments').update(update).eq('id', id);
  if (error) throw error;
}
