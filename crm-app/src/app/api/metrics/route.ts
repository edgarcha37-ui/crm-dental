import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { getMetricsByKey, getAllMetrics, upsertMetric, getLiveMetrics } from '@/lib/data/metrics';
import { insertInsight } from '@/lib/data/insights';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const rango = searchParams.get('rango');

    if (key) return NextResponse.json(await getMetricsByKey(key, rango || undefined));
    
    const staticMetrics = await getAllMetrics();
    const liveMetrics = await getLiveMetrics();

    // Actualizar las métricas estáticas con las dinámicas
    const updatedMetrics = staticMetrics.map(m => {
        if (m.metric_key === 'ingresos_totales') return { ...m, metric_value: liveMetrics.ingresos_totales };
        if (m.metric_key === 'ingresos_totales_anterior') return { ...m, metric_value: liveMetrics.ingresos_totales_anterior };
        if (m.metric_key === 'pacientes_nuevos') return { ...m, metric_value: liveMetrics.pacientes_nuevos };
        if (m.metric_key === 'pacientes_nuevos_anterior') return { ...m, metric_value: liveMetrics.pacientes_nuevos_anterior };
        if (m.metric_key === 'tasa_retencion') return { ...m, metric_value: liveMetrics.tasa_seguimiento, metric_label: 'Continuidad Clínica' };
        return m;
    });

    // Generar Smart Insight si la continuidad baja del 60% — máximo 1 por semana
    if (liveMetrics.tasa_seguimiento < 60) {
        try {
            const { getInsights } = await import('@/lib/data/insights');
            const allInsights = await getInsights();
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const alreadyExists = allInsights.some(insight =>
                insight.titulo === 'Baja Tasa de Seguimiento' &&
                insight.fecha >= oneWeekAgo
            );
            if (!alreadyExists) {
                await insertInsight({
                    categoria: 'Operaciones',
                    titulo: 'Baja Tasa de Seguimiento',
                    contenido: `Muchos pacientes terminan sus citas sin agendar la siguiente. Tasa actual: ${liveMetrics.tasa_seguimiento}%.`,
                    accion_sugerida: 'Revisar el proceso de salida en recepción. Implementar un guion de reagendamiento antes de procesar el pago.',
                    visto: false,
                    fecha: new Date().toISOString(),
                });
            }
        } catch (e) {
            logApiError('Error auto-generando insight', e);
        }
    }

    return NextResponse.json(updatedMetrics);
}

// Endpoint para n8n: escribir métricas calculadas
export async function POST(request: NextRequest) {
    const body = await request.json();
    const result = await upsertMetric(body);
    return NextResponse.json(result, { status: 201 });
}
