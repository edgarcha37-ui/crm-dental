import { getSupabaseAdmin } from '../supabase';

export interface Doctor {
  id: number;
  nombre: string;
  especialidad: string | null;
  cedula: string | null;
  correo: string | null;
  telefono: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export async function getDoctors(soloActivos = true): Promise<Doctor[]> {
  const db = getSupabaseAdmin();
  let q = db.from('doctors').select('*');
  if (soloActivos) q = q.eq('activo', true);
  const { data, error } = await q.order('nombre', { ascending: true });
  if (error) throw error;
  return (data as Doctor[]) || [];
}

export async function getDoctorById(id: number): Promise<Doctor | undefined> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('doctors').select('*').eq('id', id).single();
  if (error) return undefined;
  return data as Doctor;
}

export async function createDoctor(data: Partial<Doctor>): Promise<{ id: number }> {
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from('doctors').insert({
    nombre: data.nombre,
    especialidad: data.especialidad ?? null,
    cedula: data.cedula ?? null,
    correo: data.correo ?? null,
    telefono: data.telefono ?? null,
    activo: data.activo ?? true,
  }).select('id').single();
  if (error) throw error;
  return { id: row.id };
}

export async function updateDoctor(id: number, data: Partial<Doctor>): Promise<void> {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  for (const k of ['nombre', 'especialidad', 'cedula', 'correo', 'telefono', 'activo'] as const) {
    if (data[k] !== undefined) update[k] = data[k];
  }
  if (Object.keys(update).length === 0) return;
  update.updated_at = new Date().toISOString();
  const { error } = await db.from('doctors').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteDoctor(id: number): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('doctors').delete().eq('id', id);
  if (error) throw error;
}
