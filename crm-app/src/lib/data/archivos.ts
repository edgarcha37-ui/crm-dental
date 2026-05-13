import { getSupabaseAdmin } from '../supabase';

export interface ArchivoClinico {
  id: number;
  paciente_id: number;
  nombre_archivo: string;
  url_publica: string;
  storage_path: string;
  tipo_archivo: string;
  peso_archivo: number;
  categoria: string;
  created_at: string;
}

export async function getArchivosByPaciente(pacienteId: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('archivos_paciente')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ArchivoClinico[];
}

export async function createArchivoRecord(data: Omit<ArchivoClinico, 'id' | 'created_at'>) {
  const db = getSupabaseAdmin();
  const { data: result, error } = await db.from('archivos_paciente').insert(data).select().single();
  if (error) throw error;
  return result as ArchivoClinico;
}

export async function deleteArchivo(id: number) {
  const db = getSupabaseAdmin();
  // Get storage path first
  const { data } = await db.from('archivos_paciente').select('storage_path').eq('id', id).single();
  if (data?.storage_path) {
    await db.storage.from('archivos-crm').remove([data.storage_path]);
  }
  const { error } = await db.from('archivos_paciente').delete().eq('id', id);
  if (error) throw error;
}

export async function getPresignedUploadUrl(pacienteId: number, fileName: string, contentType: string) {
  const db = getSupabaseAdmin();
  const ext = fileName.split('.').pop();
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `paciente_${pacienteId}/${safeName}`;

  const { data, error } = await db.storage.from('archivos-crm').createSignedUploadUrl(path);
  if (error) throw error;

  const { data: urlData } = db.storage.from('archivos-crm').getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: urlData.publicUrl,
    originalName: fileName,
  };
}
