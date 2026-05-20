import { getSupabaseAdmin } from '../supabase';

export type SettingsSection = 'clinica' | 'perfil' | 'notificaciones';

export interface ClinicaSettings {
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  horario_apertura: string;
  horario_cierre: string;
  dias_atencion: string[];
}

export interface PerfilSettings {
  nombre: string;
  especialidad: string;
  cedula: string;
  universidad: string;
  correo: string;
  telefono: string;
}

export interface NotificacionesSettings {
  recordatorio_cita: boolean;
  confirmacion_cita: boolean;
  cancelacion_cita: boolean;
  pago_pendiente: boolean;
  nuevo_paciente: boolean;
  reporte_diario: boolean;
  horas_anticipacion: string;
}

export interface AllSettings {
  clinica: ClinicaSettings;
  perfil: PerfilSettings;
  notificaciones: NotificacionesSettings;
}

const DEFAULTS: AllSettings = {
  clinica: {
    nombre: 'Mi Consultorio',
    direccion: '',
    telefono: '',
    correo: '',
    horario_apertura: '09:00',
    horario_cierre: '18:00',
    dias_atencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  },
  perfil: { nombre: '', especialidad: '', cedula: '', universidad: '', correo: '', telefono: '' },
  notificaciones: {
    recordatorio_cita: true,
    confirmacion_cita: true,
    cancelacion_cita: true,
    pago_pendiente: true,
    nuevo_paciente: false,
    reporte_diario: true,
    horas_anticipacion: '24',
  },
};

export async function getAllSettings(): Promise<AllSettings> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('clinic_settings').select('section, data');
  if (error) throw error;

  const bySection: Record<string, unknown> = {};
  for (const row of data || []) {
    bySection[row.section] = row.data;
  }

  // Si una sección no está en la BD, devolvemos defaults para no romper la UI.
  return {
    clinica: (bySection.clinica as ClinicaSettings) ?? DEFAULTS.clinica,
    perfil: (bySection.perfil as PerfilSettings) ?? DEFAULTS.perfil,
    notificaciones: (bySection.notificaciones as NotificacionesSettings) ?? DEFAULTS.notificaciones,
  };
}

export async function upsertSettings(section: SettingsSection, data: unknown) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('clinic_settings')
    .upsert({ section, data, updated_at: new Date().toISOString() }, { onConflict: 'section' });
  if (error) throw error;
}
