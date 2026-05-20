import { getSupabaseAdmin } from '../supabase';

export type LabWorkEstado = 'En camino' | 'Listo para colocar' | 'Retrasado' | 'Colocado' | 'Cancelado';

export interface LabWork {
  id: number;
  paciente_id: number | null;
  tratamiento_id: number | null;
  trabajo: string;
  laboratorio: string | null;
  estado: LabWorkEstado;
  fecha_envio: string | null;
  fecha_estimada: string | null;
  fecha_recepcion: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  paciente_nombre?: string;
}

export async function getLabWorks(estado?: LabWorkEstado): Promise<LabWork[]> {
  const db = getSupabaseAdmin();
  let q = db.from('lab_works').select('*, patients(nombre)');
  if (estado) q = q.eq('estado', estado);
  const { data, error } = await q.order('fecha_estimada', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data || []) as unknown[]).map(row => {
    const r = row as { patients?: { nombre: string }; [key: string]: unknown };
    return { ...r, paciente_nombre: r.patients?.nombre } as LabWork;
  });
}

/** Trabajos activos (no colocados/cancelados) — para el widget del dashboard. */
export async function getActiveLabWorks(limit = 5): Promise<LabWork[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('lab_works')
    .select('*, patients(nombre)')
    .in('estado', ['En camino', 'Listo para colocar', 'Retrasado'])
    .order('fecha_estimada', { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as unknown[]).map(row => {
    const r = row as { patients?: { nombre: string }; [key: string]: unknown };
    return { ...r, paciente_nombre: r.patients?.nombre } as LabWork;
  });
}

export async function createLabWork(data: Partial<LabWork>): Promise<{ id: number }> {
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from('lab_works').insert({
    paciente_id: data.paciente_id ?? null,
    tratamiento_id: data.tratamiento_id ?? null,
    trabajo: data.trabajo,
    laboratorio: data.laboratorio ?? null,
    estado: data.estado ?? 'En camino',
    fecha_envio: data.fecha_envio ?? null,
    fecha_estimada: data.fecha_estimada ?? null,
    fecha_recepcion: data.fecha_recepcion ?? null,
    notas: data.notas ?? null,
  }).select('id').single();
  if (error) throw error;
  return { id: row.id };
}

export async function updateLabWork(id: number, data: Partial<LabWork>): Promise<void> {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  for (const k of ['paciente_id', 'tratamiento_id', 'trabajo', 'laboratorio', 'estado', 'fecha_envio', 'fecha_estimada', 'fecha_recepcion', 'notas'] as const) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  if (Object.keys(update).length === 0) return;
  update.updated_at = new Date().toISOString();
  const { error } = await db.from('lab_works').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteLabWork(id: number): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('lab_works').delete().eq('id', id);
  if (error) throw error;
}
