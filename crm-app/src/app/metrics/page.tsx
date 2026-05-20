import { getAllMetrics, getLiveMetrics } from '@/lib/data/metrics';
import { getInsights } from '@/lib/data/insights';
import { getPatientsAtRisk } from '@/lib/data/patients';
import MetricsClient from './_components/MetricsClient';

export const dynamic = 'force-dynamic';

export default async function MetricsPage() {
  // SC: paralelo metrics estáticas + insights + at-risk.
  // getLiveMetrics está cacheada 5 min.
  const [staticMetrics, liveMetrics, insights, atRisk] = await Promise.all([
    getAllMetrics(),
    getLiveMetrics(),
    getInsights(),
    getPatientsAtRisk(),
  ]);

  // Mismo merge que /api/metrics: sobrescribe estáticas con live cuando aplique.
  const merged = staticMetrics.map(m => {
    if (m.metric_key === 'ingresos_totales') return { ...m, metric_value: liveMetrics.ingresos_totales };
    if (m.metric_key === 'ingresos_totales_anterior') return { ...m, metric_value: liveMetrics.ingresos_totales_anterior };
    if (m.metric_key === 'pacientes_nuevos') return { ...m, metric_value: liveMetrics.pacientes_nuevos };
    if (m.metric_key === 'pacientes_nuevos_anterior') return { ...m, metric_value: liveMetrics.pacientes_nuevos_anterior };
    if (m.metric_key === 'tasa_retencion') return { ...m, metric_value: liveMetrics.tasa_seguimiento, metric_label: 'Continuidad Clínica' };
    return m;
  });

  return (
    <MetricsClient
      initialMetrics={merged}
      initialInsights={insights}
      initialPatientsAtRisk={atRisk}
    />
  );
}
