import { getSupabaseAdmin } from '../supabase';

export interface BusinessInsight {
    id: number;
    fecha: string;
    categoria: 'Marketing' | 'Operaciones' | 'Retención';
    titulo: string;
    contenido: string;
    accion_sugerida: string | null;
    visto: boolean;
    created_at: string;
}

export async function getInsights(): Promise<BusinessInsight[]> {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('business_insights')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data as BusinessInsight[];
}

export async function insertInsight(
    payload: Omit<BusinessInsight, 'id' | 'created_at'>
): Promise<{ id: number }> {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('business_insights')
        .insert(payload)
        .select('id')
        .single();
    if (error) throw error;
    return { id: data.id };
}

export async function markInsightSeen(id: number): Promise<void> {
    const db = getSupabaseAdmin();
    const { error } = await db
        .from('business_insights')
        .update({ visto: true })
        .eq('id', id);
    if (error) throw error;
}
