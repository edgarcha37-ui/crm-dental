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

import { toDateOnly, todayDateOnly, startOfThisMonth, endOfThisMonth, startOfLastMonth, endOfLastMonth } from '../dates';

interface LiveMetricsResult {
    ingresos_totales: number;
    ingresos_totales_anterior: number;
    pacientes_nuevos: number;
    pacientes_nuevos_anterior: number;
    tasa_seguimiento: number;
}

// Cache en memoria. 5 minutos es suficiente: el dashboard se mira con frecuencia
// pero los datos no necesitan ser absolutamente fresh second-by-second.
let cached: { at: number; data: LiveMetricsResult } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateLiveMetricsCache(): void {
    cached = null;
}

async function computeLiveMetrics(): Promise<LiveMetricsResult> {
    const db = getSupabaseAdmin();
    const now = new Date();

    // DATE bounds — para invoices.fecha y appointments.fecha (columnas DATE)
    const startOfThisMonthDate = toDateOnly(startOfThisMonth(now));
    const endOfThisMonthDate = toDateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const startOfLastMonthDate = toDateOnly(startOfLastMonth(now));
    const endOfLastMonthDate = toDateOnly(new Date(now.getFullYear(), now.getMonth(), 0));
    const todayDate = todayDateOnly();
    const last30DaysDate = toDateOnly(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

    // TIMESTAMPTZ bounds — para patients.fecha_registro
    const startOfThisMonthTs = startOfThisMonth(now).toISOString();
    const endOfThisMonthTs = endOfThisMonth(now).toISOString();
    const startOfLastMonthTs = startOfLastMonth(now).toISOString();
    const endOfLastMonthTs = endOfLastMonth(now).toISOString();

    // 1. Ingresos Totales (Mes actual vs Mes Anterior) — invoices.fecha es DATE
    const [{ data: incThis }, { data: incLast }] = await Promise.all([
        db.from('invoices').select('monto').eq('estatus', 'Pagada').gte('fecha', startOfThisMonthDate).lte('fecha', endOfThisMonthDate),
        db.from('invoices').select('monto').eq('estatus', 'Pagada').gte('fecha', startOfLastMonthDate).lte('fecha', endOfLastMonthDate)
    ]);
    const ingresos_totales = (incThis || []).reduce((acc: number, i: { monto: number | null }) => acc + (i.monto || 0), 0);
    const ingresos_totales_anterior = (incLast || []).reduce((acc: number, i: { monto: number | null }) => acc + (i.monto || 0), 0);

    // 2. Pacientes Nuevos (Mes actual vs Mes Anterior) — patients.fecha_registro es TIMESTAMPTZ
    const [{ count: patThis }, { count: patLast }] = await Promise.all([
        db.from('patients').select('id', { count: 'exact', head: true }).gte('fecha_registro', startOfThisMonthTs).lte('fecha_registro', endOfThisMonthTs),
        db.from('patients').select('id', { count: 'exact', head: true }).gte('fecha_registro', startOfLastMonthTs).lte('fecha_registro', endOfLastMonthTs)
    ]);
    const pacientes_nuevos = patThis ?? 0;
    const pacientes_nuevos_anterior = patLast ?? 0;

    // 3. Tasa de Seguimiento Activo (Continuidad Clínica) — appointments.fecha es DATE
    const { data: recentAppointments } = await db.from('appointments')
        .select('paciente_id')
        .gte('fecha', last30DaysDate)
        .lte('fecha', todayDate);

    let tasa_seguimiento = 0;
    if (recentAppointments && recentAppointments.length > 0) {
        const recentPatientIds = [...new Set(recentAppointments.map((a: { paciente_id: number }) => a.paciente_id))];

        const { data: futureAppointments } = await db.from('appointments')
            .select('paciente_id')
            .in('paciente_id', recentPatientIds)
            .gt('fecha', todayDate);

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

export async function getLiveMetrics(): Promise<LiveMetricsResult> {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.data;
    }
    const data = await computeLiveMetrics();
    cached = { at: Date.now(), data };
    return data;
}
