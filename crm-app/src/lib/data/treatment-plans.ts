import { getSupabaseAdmin } from '../supabase';

export type TreatmentPlanEstado = 'Planeado' | 'En Progreso' | 'Completado' | 'Cancelado' | 'Suspendido';

export interface TreatmentPlan {
  id: number;
  paciente_id: number;
  nombre: string;
  descripcion: string | null;
  estado: TreatmentPlanEstado;
  fecha_inicio: string;
  fecha_estimada_fin: string | null;
  created_at: string;
  updated_at: string;
  // Calculados al leer
  total_treatments?: number;
  completed_treatments?: number;
  costo_total?: number;
  monto_pagado?: number;
}

export async function getPlansByPatient(pacienteId: number): Promise<TreatmentPlan[]> {
  const db = getSupabaseAdmin();
  const { data: plans, error } = await db
    .from('treatment_plans')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!plans || plans.length === 0) return [];

  // Para cada plan, agregamos contadores y montos desde treatments en una query.
  const ids = plans.map((p: { id: number }) => p.id);
  const { data: tx } = await db
    .from('treatments')
    .select('plan_id, estatus, costo_total, monto_pagado')
    .in('plan_id', ids);

  return (plans as TreatmentPlan[]).map(p => {
    const treatments = (tx || []).filter((t: { plan_id: number }) => t.plan_id === p.id);
    const total_treatments = treatments.length;
    const completed_treatments = treatments.filter((t: { estatus: string }) => t.estatus === 'Completado').length;
    const costo_total = treatments.reduce((acc: number, t: { costo_total: number | null }) => acc + (t.costo_total || 0), 0);
    const monto_pagado = treatments.reduce((acc: number, t: { monto_pagado: number | null }) => acc + (t.monto_pagado || 0), 0);
    return { ...p, total_treatments, completed_treatments, costo_total, monto_pagado };
  });
}

export async function createPlan(data: {
  paciente_id: number;
  nombre: string;
  descripcion?: string | null;
  estado?: TreatmentPlanEstado;
  fecha_inicio?: string;
  fecha_estimada_fin?: string | null;
}): Promise<{ id: number }> {
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from('treatment_plans').insert({
    paciente_id: data.paciente_id,
    nombre: data.nombre,
    descripcion: data.descripcion ?? null,
    estado: data.estado ?? 'En Progreso',
    fecha_inicio: data.fecha_inicio ?? new Date().toISOString().split('T')[0],
    fecha_estimada_fin: data.fecha_estimada_fin ?? null,
  }).select('id').single();
  if (error) throw error;
  return { id: row.id };
}

export async function updatePlan(id: number, data: Partial<TreatmentPlan>): Promise<void> {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  for (const k of ['nombre', 'descripcion', 'estado', 'fecha_inicio', 'fecha_estimada_fin'] as const) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  if (Object.keys(update).length === 0) return;
  update.updated_at = new Date().toISOString();
  const { error } = await db.from('treatment_plans').update(update).eq('id', id);
  if (error) throw error;
}

export async function deletePlan(id: number): Promise<void> {
  const db = getSupabaseAdmin();
  // Los treatments vinculados quedan con plan_id NULL (FK ON DELETE SET NULL).
  const { error } = await db.from('treatment_plans').delete().eq('id', id);
  if (error) throw error;
}
