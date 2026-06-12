import { getSupabaseAdmin } from '../supabase';

const BUCKET = 'archivos-crm';

// Cache de "ya verificamos que existe" — el listBuckets es relativamente caro,
// y no queremos pegarle en cada upload.
let bucketEnsured = false;

/**
 * Garantiza que el bucket de Storage exista antes del primer upload.
 * Si no existe lo crea. Antes esto fallaba silencioso y dejaba metadata huérfana.
 */
async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const db = getSupabaseAdmin();
  try {
    const { data: buckets, error } = await db.storage.listBuckets();
    if (error) throw error;
    if (buckets && buckets.some((b: { name: string }) => b.name === BUCKET)) {
      bucketEnsured = true;
      return;
    }
    const { error: createErr } = await db.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      throw createErr;
    }
    bucketEnsured = true;
  } catch (err) {
    console.error('ensureBucket falló:', err);
    throw new Error(`No se pudo asegurar el bucket "${BUCKET}". Verifica permisos del service_role key.`);
  }
}

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
    await db.storage.from(BUCKET).remove([data.storage_path]);
  }
  const { error } = await db.from('archivos_paciente').delete().eq('id', id);
  if (error) throw error;
}

export async function getPresignedUploadUrl(pacienteId: number, fileName: string) {
  await ensureBucket();
  const db = getSupabaseAdmin();
  const ext = fileName.split('.').pop();
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `paciente_${pacienteId}/${safeName}`;

  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: urlData.publicUrl,
    originalName: fileName,
  };
}
