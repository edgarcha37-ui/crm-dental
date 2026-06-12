import { getSupabaseAdmin } from '../supabase';
import { todayDateOnly } from '../dates';

export interface Appointment {
  id: number;
  paciente_id: number;
  doctor_id?: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  motivo_consulta?: string | null;
  notas_clinicas?: string | null;
  estado: string;
  duracion?: number | null;
  fuente?: string | null;
  created_at: string;
  paciente_nombre?: string;
}

export async function getAppointments(fecha?: string) {
  const db = getSupabaseAdmin();
  let query = db.from('appointments').select('*, patients(nombre)');
  if (fecha) query = query.eq('fecha', fecha);
  const { data, error } = await query.order('hora_inicio', { ascending: true });
  if (error) throw error;
  return ((data || []) as unknown[]).map((a) => {
    const row = a as { patients?: { nombre: string };[key: string]: unknown };
    return { ...row, paciente_nombre: row.patients?.nombre } as Appointment;
  });
}

export async function getAppointmentsByWeek(startDate: string, endDate: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('appointments')
    .select('*, patients(nombre)')
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true });
  if (error) throw error;
  return ((data || []) as unknown[]).map((a) => {
    const row = a as { patients?: { nombre: string };[key: string]: unknown };
    return { ...row, paciente_nombre: row.patients?.nombre } as Appointment;
  });
}

export async function getAppointmentsByPatient(pacienteId: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('appointments')
    .select('*, patients(nombre)')
    .eq('paciente_id', pacienteId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return ((data || []) as unknown[]).map((a) => {
    const row = a as { patients?: { nombre: string };[key: string]: unknown };
    return { ...row, paciente_nombre: row.patients?.nombre } as Appointment;
  });
}

export async function createAppointment(data: Omit<Appointment, 'id' | 'created_at' | 'paciente_nombre'>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('appointments').insert({
    paciente_id: data.paciente_id,
    fecha: data.fecha,
    hora_inicio: data.hora_inicio,
    hora_fin: data.hora_fin,
    motivo: data.motivo,
    estado: data.estado,
    duracion: data.duracion ?? null,
    doctor_id: data.doctor_id ?? null,
  }).select().single();
  if (error) throw error;
  return { id: result.id };
}

export async function updateAppointment(id: number, data: Partial<Appointment>) {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (data.fecha !== undefined) update.fecha = data.fecha;
  if (data.hora_inicio !== undefined) update.hora_inicio = data.hora_inicio;
  if (data.hora_fin !== undefined) update.hora_fin = data.hora_fin;
  if (data.motivo !== undefined) update.motivo = data.motivo;
  if (data.estado !== undefined) update.estado = data.estado;
  if (Object.keys(update).length === 0) return;
  const { error } = await db.from('appointments').update(update).eq('id', id);
  if (error) throw error;
}

export async function getTodayAppointmentCount() {
  const db = getSupabaseAdmin();
  // Hora local del server (CDMX), no UTC: con toISOString, después de las 18:00
  // las "citas de hoy" eran las de mañana.
  const today = todayDateOnly();
  const { count, error } = await db.from('appointments').select('id', { count: 'exact', head: true }).eq('fecha', today);
  if (error) throw error;
  return count ?? 0;
}
