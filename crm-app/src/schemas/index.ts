/**
 * Schemas zod para validar inputs en boundaries (route handlers, forms).
 * Los literales de estatus vienen de /types para evitar drift.
 */
import { z } from 'zod';
import {
  TREATMENT_ESTATUS,
  APPOINTMENT_ESTADOS,
  INVOICE_ESTATUS,
  NOTE_PRIORIDAD,
  NOTA_OPERATIVA_CATEGORIA,
  LAB_WORK_ESTADO,
  TREATMENT_CLASIFICACION,
} from '@/types';

// Helpers
const nonEmpty = z.string().trim().min(1);
const optionalText = z.string().trim().nullish().transform(v => v === '' ? null : v);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD');
const isoTime = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Hora HH:MM o HH:MM:SS');

// ============================================================
// Patient
// ============================================================
export const createPatientSchema = z.object({
  nombre: nonEmpty,
  telefono: optionalText,
  correo: z.string().email().nullish().or(z.literal('')).transform(v => v || null),
  direccion: optionalText,
  sexo: optionalText,
  fecha_nacimiento: isoDate.nullish().or(z.literal('')).transform(v => v || null),
  fuente_captacion: optionalText,
  notas_generales: optionalText,
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial().extend({
  archivado: z.boolean().optional(),
  // 'accion' soportado por la route para archivar/restaurar
  accion: z.enum(['archivar', 'restaurar']).optional(),
});

// ============================================================
// Treatment
// ============================================================
export const createTreatmentSchema = z.object({
  paciente_id: z.number().int().positive(),
  nombre_tratamiento: nonEmpty,
  clasificacion: z.enum(TREATMENT_CLASIFICACION).nullish(),
  estatus: z.enum(TREATMENT_ESTATUS).default('Pendiente'),
  costo_total: z.number().nonnegative().default(0),
  monto_pagado: z.number().nonnegative().default(0),
  fecha_inicio: isoDate.nullish(),
  fecha_fin: isoDate.nullish(),
  notas: optionalText,
});

// Schema de update sin defaults: .partial() sobre createTreatmentSchema hereda .default(0)
// de costo_total/monto_pagado, lo que inyectaría 0 aunque el campo no venga en el body.
export const updateTreatmentSchema = z.object({
  nombre_tratamiento: nonEmpty,
  clasificacion: z.enum(TREATMENT_CLASIFICACION).nullish(),
  estatus: z.enum(TREATMENT_ESTATUS),
  costo_total: z.number().nonnegative(),
  monto_pagado: z.number().nonnegative(),
  fecha_inicio: isoDate.nullish(),
  fecha_fin: isoDate.nullish(),
  notas: optionalText,
  plan_id: z.number().int().positive().nullable(),
}).partial();

// ============================================================
// Appointment
// ============================================================
export const createAppointmentSchema = z.object({
  paciente_id: z.number().int().positive(),
  doctor_id: z.number().int().positive().nullish(),
  fecha: isoDate,
  hora_inicio: isoTime,
  hora_fin: isoTime,
  motivo: nonEmpty,
  estado: z.enum(APPOINTMENT_ESTADOS).default('Pendiente'),
  duracion: z.number().int().positive().nullish(),
  fuente: optionalText,
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

// ============================================================
// Invoice
// ============================================================
export const createInvoiceSchema = z.object({
  paciente_id: z.number().int().positive().nullish(),
  tratamiento_id: z.number().int().positive().nullish(),
  numero_factura: optionalText,
  razon_social: optionalText,
  rfc: optionalText,
  direccion_fiscal: optionalText,
  uso_cfdi: optionalText,
  monto: z.number().positive(),
  fecha: isoDate.optional(),
  estatus: z.enum(INVOICE_ESTATUS).default('Pendiente'),
});

// ============================================================
// Note
// ============================================================
export const createNoteSchema = z.object({
  paciente_id: z.number().int().positive().nullish(),
  titulo: optionalText,
  contenido: nonEmpty,
  tipo: z.enum(['nota', 'recordatorio', 'tarea']).default('nota'),
  prioridad: z.enum(NOTE_PRIORIDAD).default('Media'),
  categoria: optionalText,
  completada: z.boolean().default(false),
  fecha_vencimiento: isoDate.nullish(),
});

// ============================================================
// NotaOperativa
// ============================================================
export const createNotaOperativaSchema = z.object({
  titulo: nonEmpty,
  categoria: z.enum(NOTA_OPERATIVA_CATEGORIA),
  prioridad: z.enum(NOTE_PRIORIDAD).default('Media'),
  completada: z.boolean().default(false),
  fecha_vencimiento: isoDate.nullish().or(z.literal('')).transform(v => v || null),
});

export const updateNotaOperativaSchema = z.object({
  id: z.number().int().positive(),
  titulo: nonEmpty.optional(),
  categoria: z.enum(NOTA_OPERATIVA_CATEGORIA).optional(),
  prioridad: z.enum(NOTE_PRIORIDAD).optional(),
  completada: z.boolean().optional(),
  fecha_vencimiento: isoDate.nullish(),
});

// ============================================================
// Doctor
// ============================================================
export const createDoctorSchema = z.object({
  nombre: nonEmpty,
  especialidad: optionalText,
  cedula: optionalText,
  correo: z.string().email().nullish().or(z.literal('')).transform(v => v || null),
  telefono: optionalText,
  activo: z.boolean().default(true),
});

export const updateDoctorSchema = createDoctorSchema.partial();

// ============================================================
// LabWork
// ============================================================
export const createLabWorkSchema = z.object({
  paciente_id: z.number().int().positive().nullish(),
  tratamiento_id: z.number().int().positive().nullish(),
  trabajo: nonEmpty,
  laboratorio: optionalText,
  estado: z.enum(LAB_WORK_ESTADO).default('En camino'),
  fecha_envio: isoDate.nullish(),
  fecha_estimada: isoDate.nullish(),
  fecha_recepcion: isoDate.nullish(),
  notas: optionalText,
});

export const updateLabWorkSchema = createLabWorkSchema.partial();

// ============================================================
// Settings
// ============================================================
export const settingsSectionSchema = z.enum(['clinica', 'perfil', 'notificaciones']);

export const upsertSettingsSchema = z.object({
  section: settingsSectionSchema,
  // Validación laxa del data — cada sección tiene su forma propia.
  // El front-end es el dueño de la estructura completa; la BD acepta JSONB.
  data: z.record(z.string(), z.unknown()),
});

// ============================================================
// MedicalHistory
// ============================================================
export const updateMedicalHistorySchema = z.object({
  alergias: z.array(z.string()).optional(),
  medicamentos_cronicos: z.array(z.string()).optional(),
  padecimientos: z.array(z.string()).optional(),
  tipo_sangre: optionalText,
  notas_clinicas: optionalText,
});

// ============================================================
// Abono
// ============================================================
export const createAbonoSchema = z.object({
  tratamiento_id: z.number().int().positive(),
  paciente_id: z.number().int().positive(),
  monto: z.number().positive(),
  concepto: z.string().trim().min(1).optional(),
});

// ============================================================
// Helper: respuesta uniforme de error
// ============================================================
export function zodErrorResponse(error: z.ZodError) {
  return {
    error: 'Datos inválidos',
    details: error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  };
}
