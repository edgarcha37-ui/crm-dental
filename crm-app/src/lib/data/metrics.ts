import { getSupabaseAdmin } from '../supabase';

export interface Metric {
    id: number;
    metric_key: string;
    metric_value: number;
    metric_label: string;
    periodo: string;
    rango: string;
    created_at: string;
}

export async function getMetricsByKey(key: string, rango?: string) {
    const db = getSupabaseAdmin();
    let query = db.from('metrics').select('*').eq('metric_key', key);
    if (rango) query = query.eq('rango', rango);
    const { data, error } = await query.order('periodo', { ascending: true });
    if (error) throw error;
    return data as Metric[];
}

export async function getLatestMetric(key: string) {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from('metrics').select('*').eq('metric_key', key).order('periodo', { ascending: false }).limit(1).single();
    if (error) return undefined;
    return data as Metric;
}

export async function getAllMetrics() {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from('metrics').select('*').order('metric_key').order('periodo');
    if (error) throw error;
    return data as Metric[];
}

export async function upsertMetric(data: Omit<Metric, 'id' | 'created_at'>) {
    const db = getSupabaseAdmin();
    const { data: existing } = await db
        .from('metrics')
        .select('id')
        .eq('metric_key', data.metric_key)
        .eq('periodo', data.periodo)
        .eq('metric_label', data.metric_label || '')
        .maybeSingle();

    if (existing) {
        const { error } = await db.from('metrics').update({ metric_value: data.metric_value }).eq('id', existing.id);
        if (error) throw error;
        return { id: existing.id };
    }

    const { data: result, error } = await db.from('metrics').insert({
        metric_key: data.metric_key,
        metric_value: data.metric_value,
        metric_label: data.metric_label,
        periodo: data.periodo,
        rango: data.rango,
    }).select().single();
    if (error) throw error;
    return { id: result.id };
}

export async function getLiveMetrics() {
    const db = getSupabaseAdmin();
    const now = new Date();
    
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Ingresos Totales (Mes actual vs Mes Anterior)
    const [{ data: incThis }, { data: incLast }] = await Promise.all([
        db.from('invoices').select('monto').eq('estatus', 'Pagada').gte('fecha', startOfThisMonth).lte('fecha', endOfThisMonth),
        db.from('invoices').select('monto').eq('estatus', 'Pagada').gte('fecha', startOfLastMonth).lte('fecha', endOfLastMonth)
    ]);
    const ingresos_totales = (incThis || []).reduce((acc: number, i: any) => acc + (i.monto || 0), 0);
    const ingresos_totales_anterior = (incLast || []).reduce((acc: number, i: any) => acc + (i.monto || 0), 0);

    // 2. Pacientes Nuevos (Mes actual vs Mes Anterior)
    const [{ count: patThis }, { count: patLast }] = await Promise.all([
        db.from('patients').select('id', { count: 'exact', head: true }).gte('fecha_registro', startOfThisMonth).lte('fecha_registro', endOfThisMonth),
        db.from('patients').select('id', { count: 'exact', head: true }).gte('fecha_registro', startOfLastMonth).lte('fecha_registro', endOfLastMonth)
    ]);
    const pacientes_nuevos = patThis ?? 0;
    const pacientes_nuevos_anterior = patLast ?? 0;

    // 3. Tasa de Seguimiento Activo (Continuidad Clínica)
    // Pacientes con cita en los últimos 30 días
    const { data: recentAppointments } = await db.from('appointments')
        .select('paciente_id')
        .gte('fecha', last30Days)
        .lte('fecha', now.toISOString());
    
    let tasa_seguimiento = 0;
    if (recentAppointments && recentAppointments.length > 0) {
        const recentPatientIds = [...new Set(recentAppointments.map((a: { paciente_id: number }) => a.paciente_id))];
        
        // De estos pacientes, ¿cuántos tienen citas futuras programadas?
        const { data: futureAppointments } = await db.from('appointments')
            .select('paciente_id')
            .in('paciente_id', recentPatientIds)
            .gt('fecha', now.toISOString());
            
        const futurePatientIds = new Set((futureAppointments || []).map((a: { paciente_id: number }) => a.paciente_id));
        tasa_seguimiento = Math.round((futurePatientIds.size / recentPatientIds.length) * 100);
    }

    return {
        ingresos_totales,
        ingresos_totales_anterior,
        pacientes_nuevos,
        pacientes_nuevos_anterior,
        tasa_seguimiento
    };
}
