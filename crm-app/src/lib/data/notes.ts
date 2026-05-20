import { getSupabaseAdmin } from '../supabase';

export type NotePrioridad = 'Alta' | 'Media' | 'Baja';

export interface Note {
  id: number;
  contenido: string;
  titulo: string | null;
  tipo: 'nota' | 'recordatorio' | 'tarea';
  prioridad: NotePrioridad;
  paciente_id: number | null;
  completada: boolean;
  fecha_vencimiento: string | null;
  categoria: string | null;
  fecha_creacion: string;
  updated_at: string;
  paciente_nombre?: string;
}

// Mantenemos un mapa con los valores antiguos (critical/high/medium/low) para que
// los registros pre-migración sigan ordenándose razonablemente hasta que el seed
// los normalice a Alta/Media/Baja.
const PRIORIDAD_ORDER: Record<string, number> = {
  Alta: 1, Media: 2, Baja: 3,
  critical: 1, high: 1, medium: 2, low: 3,
};

export async function getNotes() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('notes')
    .select('*, patients(nombre)')
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  const rows = ((data || []) as unknown[]).map((n) => {
    const row = n as { patients?: { nombre: string };[key: string]: unknown };
    return { ...row, paciente_nombre: row.patients?.nombre } as Note;
  });
  // Ordena por prioridad en JS
  return rows.sort((a, b) => (PRIORIDAD_ORDER[a.prioridad] ?? 5) - (PRIORIDAD_ORDER[b.prioridad] ?? 5));
}

export async function getNoteById(id: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('notes').select('*').eq('id', id).single();
  if (error) return undefined;
  return data as Note;
}

export async function getNotesByPatient(pacienteId: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('notes')
    .select('*, patients(nombre)')
    .eq('paciente_id', pacienteId)
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown[]).map((n) => {
    const row = n as { patients?: { nombre: string };[key: string]: unknown };
    return { ...row, paciente_nombre: row.patients?.nombre } as Note;
  });
}

export async function createNote(data: Partial<Omit<Note, 'id' | 'fecha_creacion' | 'updated_at' | 'paciente_nombre'>> & { contenido: string; tipo: 'nota' | 'recordatorio' | 'tarea'; prioridad: NotePrioridad }) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('notes').insert({
    contenido: data.contenido,
    titulo: data.titulo,
    tipo: data.tipo,
    prioridad: data.prioridad,
    paciente_id: data.paciente_id || null,
    completada: data.completada ?? false,
    fecha_vencimiento: data.fecha_vencimiento || null,
    categoria: data.categoria,
  }).select().single();
  if (error) throw error;
  return { id: result.id };
}

export async function updateNote(id: number, data: Partial<Note>) {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (data.contenido !== undefined) update.contenido = data.contenido;
  if (data.titulo !== undefined) update.titulo = data.titulo;
  if (data.tipo !== undefined) update.tipo = data.tipo;
  if (data.prioridad !== undefined) update.prioridad = data.prioridad;
  if (data.completada !== undefined) update.completada = data.completada;
  if (data.fecha_vencimiento !== undefined) update.fecha_vencimiento = data.fecha_vencimiento;
  if (data.categoria !== undefined) update.categoria = data.categoria;
  if (Object.keys(update).length === 0) return;
  const { error } = await db.from('notes').update(update).eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: number) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('notes').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleNoteComplete(id: number) {
  const db = getSupabaseAdmin();
  // Leer el estado actual y negarlo
  const { data } = await db.from('notes').select('completada').eq('id', id).single();
  if (!data) return;
  const { error } = await db.from('notes').update({ completada: !data.completada }).eq('id', id);
  if (error) throw error;
}
