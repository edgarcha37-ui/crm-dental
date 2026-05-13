import { getSupabaseAdmin } from '../supabase';

export interface Patient {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  sexo: string;
  fecha_nacimiento: string;
  fuente_captacion: string;
  notas_generales: string;
  archivado: boolean;
  fecha_registro: string;
  created_at: string;
  updated_at: string;
  // Calculados en JS
  ultimo_tratamiento?: string;
  estatus_tratamiento?: string;
  saldo_pendiente?: number;
}

export async function getPatients(filter?: 'activos' | 'archivados') {
  const db = getSupabaseAdmin();

  let query = db.from('patients').select('*');
  if (filter === 'archivados') query = query.eq('archivado', true);
  else if (filter === 'activos') query = query.eq('archivado', false);

  const { data: patients, error } = await query.order('fecha_registro', { ascending: false });
  if (error) throw error;

  // Obtener último tratamiento y saldo de todos los pacientes en una sola query
  const ids = (patients || []).map((p: { id: number }) => p.id);
  let treatments: { paciente_id: number; nombre_tratamiento: string; estatus: string; costo_total: number; monto_pagado: number; id: number }[] = [];
  if (ids.length > 0) {
    const { data: t } = await db.from('treatments').select('id,paciente_id,nombre_tratamiento,estatus,costo_total,monto_pagado').in('paciente_id', ids).order('id', { ascending: false });
    treatments = t || [];
  }

  return (patients || []).map((p: Record<string, unknown>) => {
    const pt = treatments.filter(t => t.paciente_id === p.id);
    const latest = pt[0];
    const saldo = pt.reduce((acc, t) => acc + Math.max(0, (t.costo_total || 0) - (t.monto_pagado || 0)), 0);
    return { ...p, ultimo_tratamiento: latest?.nombre_tratamiento, estatus_tratamiento: latest?.estatus, saldo_pendiente: saldo };
  });
}

export async function getPatientById(id: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('patients').select('*').eq('id', id).single();
  if (error) return undefined;
  return data as Patient;
}

export async function createPatient(data: Partial<Patient>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('patients').insert({
    nombre: data.nombre,
    telefono: data.telefono || null,
    correo: data.correo || null,
    direccion: data.direccion || null,
    sexo: data.sexo || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    fuente_captacion: data.fuente_captacion || 'Otro',
    notas_generales: data.notas_generales || null,
    archivado: false,
  }).select().single();
  if (error) throw error;
  return { id: result.id };
}

export async function updatePatient(id: number, data: Partial<Patient>) {
  const db = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (data.nombre !== undefined) update.nombre = data.nombre;
  if (data.telefono !== undefined) update.telefono = data.telefono;
  if (data.correo !== undefined) update.correo = data.correo;
  if (data.direccion !== undefined) update.direccion = data.direccion;
  if (data.sexo !== undefined) update.sexo = data.sexo;
  if (data.fecha_nacimiento !== undefined) update.fecha_nacimiento = data.fecha_nacimiento;
  if (data.fuente_captacion !== undefined) update.fuente_captacion = data.fuente_captacion;
  if (data.notas_generales !== undefined) update.notas_generales = data.notas_generales;
  if (data.archivado !== undefined) update.archivado = data.archivado;
  if (Object.keys(update).length === 0) return;
  const { error } = await db.from('patients').update(update).eq('id', id);
  if (error) throw error;
}

export async function archivarPaciente(id: number, archivado: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('patients').update({ archivado }).eq('id', id);
  if (error) throw error;
}

export async function deletePatient(id: number) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('patients').delete().eq('id', id);
  if (error) throw error;
}

export async function searchPatients(query: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('patients')
    .select('*')
    .ilike('nombre', `%${query}%`)
    .eq('archivado', false)
    .order('fecha_registro', { ascending: false });
  if (error) throw error;
  return data as Patient[];
}

export async function getPatientStats() {
  const db = getSupabaseAdmin();
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [newThisMonthRes, treatmentsDoneRes, pendingRes] = await Promise.all([
    db.from('patients').select('id', { count: 'exact', head: true }).gte('fecha_registro', firstOfMonth).eq('archivado', false),
    db.from('treatments').select('id', { count: 'exact', head: true }).eq('estatus', 'Completado'),
    db.from('treatments').select('id', { count: 'exact', head: true }).in('estatus', ['Pendiente', 'En Progreso']),
  ]);

  return {
    newThisMonth: newThisMonthRes.count ?? 0,
    treatmentsDone: treatmentsDoneRes.count ?? 0,
    pendingFollowups: pendingRes.count ?? 0,
  };
}

export interface PatientAtRisk {
  id: number;
  nombre: string;
  telefono: string;
  ticket: number;
  diasSinVisita: number;
}

/**
 * Pacientes con tratamiento activo de ticket alto (>$5000) sin cita en los últimos 6 meses.
 * Máximo 5 resultados para la tabla de riesgo del dashboard.
 */
export async function getPatientsAtRisk(): Promise<PatientAtRisk[]> {
  const db = getSupabaseAdmin();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Obtener tratamientos activos con ticket >5000
  const { data: treatments, error: tErr } = await db
    .from('treatments')
    .select('paciente_id, costo_total')
    .in('estatus', ['En Progreso', 'Pendiente'])
    .gte('costo_total', 5000);

  if (tErr || !treatments || treatments.length === 0) return [];

  const patientIds = [...new Set(treatments.map((t: { paciente_id: number }) => t.paciente_id))];

  // Obtener datos básicos de esos pacientes
  const { data: patients, error: pErr } = await db
    .from('patients')
    .select('id, nombre, telefono')
    .in('id', patientIds)
    .eq('archivado', false);

  if (pErr || !patients) return [];

  // Obtener la última cita de cada paciente
  const { data: appointments } = await db
    .from('appointments')
    .select('paciente_id, fecha_hora')
    .in('paciente_id', patientIds)
    .order('fecha_hora', { ascending: false });

  const now = new Date();

  return patients
    .map((p: { id: number; nombre: string; telefono: string }) => {
      const lastAppt = (appointments || []).find(
        (a: { paciente_id: number; fecha_hora: string }) => a.paciente_id === p.id
      );
      const lastDate = lastAppt ? new Date(lastAppt.fecha_hora) : new Date(0);
      const diasSinVisita = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const ticket = Math.max(
        ...treatments
          .filter((t: { paciente_id: number; costo_total: number }) => t.paciente_id === p.id)
          .map((t: { paciente_id: number; costo_total: number }) => t.costo_total || 0)
      );
      return { id: p.id, nombre: p.nombre, telefono: p.telefono, ticket, diasSinVisita };
    })
    .filter((p: PatientAtRisk) => p.diasSinVisita >= 180) // +6 meses sin visita
    .sort((a: PatientAtRisk, b: PatientAtRisk) => b.ticket - a.ticket)
    .slice(0, 5);
}
