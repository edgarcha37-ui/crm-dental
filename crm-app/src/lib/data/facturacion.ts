import { getSupabaseAdmin } from '../supabase';

export interface DatosFiscales {
  id?: number;
  paciente_id: number;
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  uso_cfdi: string;
}

export interface Factura {
  id: number;
  paciente_id: number;
  tratamiento_id?: number;
  monto_total: number;
  status: 'pendiente' | 'timbrada' | 'error' | 'cancelada';
  url_pdf?: string;
  url_xml?: string;
  external_id?: string;
  concepto?: string;
  created_at: string;
}

export async function getDatosFiscales(pacienteId: number) {
  const db = getSupabaseAdmin();
  const { data } = await db.from('datos_fiscales_pacientes').select('*').eq('paciente_id', pacienteId).single();
  return data as DatosFiscales | null;
}

export async function upsertDatosFiscales(data: DatosFiscales) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('datos_fiscales_pacientes').upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: 'paciente_id' });
  if (error) throw error;
}

export async function getFacturasByPaciente(pacienteId: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('facturas').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Factura[];
}

export async function createFactura(data: Omit<Factura, 'id' | 'created_at'>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('facturas').insert(data).select().single();
  if (error) throw error;
  return result as Factura;
}

export async function updateFacturaStatus(id: number, status: string, external_id?: string, url_pdf?: string, url_xml?: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('facturas').update({ status, external_id, url_pdf, url_xml, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
