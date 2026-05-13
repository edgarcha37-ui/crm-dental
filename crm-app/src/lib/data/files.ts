import { getSupabaseAdmin } from '../supabase';

export interface FileRecord {
    id: number;
    paciente_id: number;
    nombre_archivo: string;
    tipo_archivo: string;
    ruta_archivo: string;
    tamano: number;
    fecha_subida: string;
    paciente_nombre?: string;
}

export async function getFilesByPatient(pacienteId: number) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('files')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('fecha_subida', { ascending: false });
    if (error) throw error;
    return data as FileRecord[];
}

export async function getRecentFiles(limit = 5) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('files')
        .select('*, patients(nombre)')
        .order('fecha_subida', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return ((data || []) as unknown[]).map((f) => {
        const row = f as { patients?: { nombre: string };[key: string]: unknown };
        return { ...row, paciente_nombre: row.patients?.nombre } as FileRecord;
    });
}

export async function createFile(data: Omit<FileRecord, 'id' | 'fecha_subida'>) {
    const db = getSupabaseAdmin();
    const { data: result, error } = await db.from('files').insert({
        paciente_id: data.paciente_id,
        nombre_archivo: data.nombre_archivo,
        tipo_archivo: data.tipo_archivo,
        ruta_archivo: data.ruta_archivo,
        tamano: data.tamano,
    }).select().single();
    if (error) throw error;
    return { id: result.id };
}

export async function deleteFile(id: number) {
    const db = getSupabaseAdmin();
    const { error } = await db.from('files').delete().eq('id', id);
    if (error) throw error;
}
