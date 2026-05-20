/**
 * Tipos compartidos del dominio. Una sola fuente de verdad para evitar
 * redefiniciones en cada page.tsx. Acompañados por schemas zod en /schemas
 * para validación en boundaries (route handlers, forms).
 */

// ============================================================
// Literales de estatus / categorías
// ============================================================

export const TREATMENT_ESTATUS = ['Pendiente', 'En Progreso', 'Completado', 'Cancelado', 'Suspendido'] as const;
export type TreatmentEstatus = typeof TREATMENT_ESTATUS[number];

export const APPOINTMENT_ESTADOS = ['Confirmada', 'Pendiente', 'Completada', 'Cancelada', 'No Asistió'] as const;
export type AppointmentEstado = typeof APPOINTMENT_ESTADOS[number];

export const INVOICE_ESTATUS = ['Pendiente', 'Pagada', 'Vencida', 'Cancelada'] as const;
export type InvoiceEstatus = typeof INVOICE_ESTATUS[number];

export const NOTE_PRIORIDAD = ['Alta', 'Media', 'Baja'] as const;
export type NotePrioridad = typeof NOTE_PRIORIDAD[number];

export const NOTA_OPERATIVA_CATEGORIA = ['Suministros', 'Mantenimiento', 'Laboratorio'] as const;
export type NotaOperativaCategoria = typeof NOTA_OPERATIVA_CATEGORIA[number];

export const LAB_WORK_ESTADO = ['En camino', 'Listo para colocar', 'Retrasado', 'Colocado', 'Cancelado'] as const;
export type LabWorkEstado = typeof LAB_WORK_ESTADO[number];

export const TREATMENT_CLASIFICACION = ['Básico', 'Avanzado', 'Estético', 'Ortodoncia', 'Cirugía'] as const;
export type TreatmentClasificacion = typeof TREATMENT_CLASIFICACION[number];


// ============================================================
// Entidades
// ============================================================

export interface Patient {
  id: number;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  fuente_captacion: string | null;
  notas_generales: string | null;
  archivado: boolean;
  fecha_registro: string;
  created_at: string;
  updated_at: string;
  /** Calculados en JS / vista — opcionales */
  ultimo_tratamiento?: string;
  estatus_tratamiento?: TreatmentEstatus;
  saldo_pendiente?: number;
}

export interface Treatment {
  id: number;
  paciente_id: number;
  nombre_tratamiento: string;
  clasificacion: TreatmentClasificacion | null;
  estatus: TreatmentEstatus;
  costo_total: number;
  monto_pagado: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  paciente_id: number;
  doctor_id?: number | null;
  fecha: string;        // DATE 'YYYY-MM-DD'
  hora_inicio: string;  // TIME 'HH:MM' o 'HH:MM:SS'
  hora_fin: string;
  motivo: string;
  motivo_consulta?: string;
  notas_clinicas?: string;
  estado: AppointmentEstado;
  duracion?: number | null;
  fuente?: string;
  created_at: string;
  paciente_nombre?: string;
}

export interface Invoice {
  id: number;
  paciente_id: number | null;
  tratamiento_id: number | null;
  numero_factura: string | null;
  razon_social: string | null;
  rfc: string | null;
  direccion_fiscal: string | null;
  uso_cfdi: string | null;
  monto: number;
  fecha: string;
  estatus: InvoiceEstatus;
  paciente_nombre?: string;
  tratamiento_nombre?: string;
}

export interface Note {
  id: number;
  paciente_id: number | null;
  titulo: string | null;
  contenido: string;
  tipo: 'nota' | 'recordatorio' | 'tarea';
  prioridad: NotePrioridad;
  categoria: string | null;
  completada: boolean;
  fecha_vencimiento: string | null;
  fecha_creacion: string;
  updated_at: string;
  paciente_nombre?: string;
}

export interface NotaOperativa {
  id: number;
  titulo: string;
  categoria: NotaOperativaCategoria;
  prioridad: NotePrioridad;
  completada: boolean;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
}

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

export interface MedicalHistory {
  paciente_id: number;
  alergias: string[];
  medicamentos_cronicos: string[];
  padecimientos: string[];
  tipo_sangre: string | null;
  notas_clinicas: string | null;
  updated_at?: string;
}
