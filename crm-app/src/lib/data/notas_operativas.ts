import { getSupabaseAdmin } from '../supabase';

export interface NotaOperativa {
  id: number;
  usuario_id: number | null;
  titulo: string;
  categoria: 'Suministros' | 'Mantenimiento' | 'Laboratorio';
  prioridad: 'Alta' | 'Media' | 'Baja';
  completada: boolean;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
}

const PRIORIDAD_ORDER: Record<string, number> = { Alta: 1, Media: 2, Baja: 3 };

export async function getNotasOperativas() {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('notas_operativas')
    .select('*')
    .order('completada', { ascending: true })
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  
  const rows = data as NotaOperativa[];
  // Ordenar por prioridad primero, pero dejando las completadas al final (ya manejado por SQL en parte, pero reaseguramos)
  return rows.sort((a, b) => {
    if (a.completada !== b.completada) return a.completada ? 1 : -1;
    return (PRIORIDAD_ORDER[a.prioridad] ?? 4) - (PRIORIDAD_ORDER[b.prioridad] ?? 4);
  });
}

export async function createNotaOperativa(data: Omit<NotaOperativa, 'id' | 'fecha_creacion' | 'usuario_id'> & { usuario_id?: number | null }) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('notas_operativas').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateNotaOperativa(id: number, data: Partial<NotaOperativa>) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('notas_operativas').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteNotaOperativa(id: number) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('notas_operativas').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleNotaOperativaComplete(id: number, currentState: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('notas_operativas').update({ completada: !currentState }).eq('id', id);
  if (error) throw error;
}
