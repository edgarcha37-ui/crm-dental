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

  // Merge live values into static records (or inject new records if placeholders are missing)
  const LIVE_KEYS = new Set(['ingresos_totales','ingresos_totales_anterior','pacientes_nuevos','pacientes_nuevos_anterior','tasa_retencion']);
  const merged = staticMetrics
    .filter(m => !LIVE_KEYS.has(m.metric_key))
    .concat([
      { id: -1, metric_key: 'ingresos_totales',          metric_value: liveMetrics.ingresos_totales,          metric_label: 'Ingresos Totales',       periodo: '', rango: '', created_at: '' },
      { id: -2, metric_key: 'ingresos_totales_anterior',  metric_value: liveMetrics.ingresos_totales_anterior,  metric_label: 'Ingresos Mes Anterior',   periodo: '', rango: '', created_at: '' },
      { id: -3, metric_key: 'pacientes_nuevos',           metric_value: liveMetrics.pacientes_nuevos,           metric_label: 'Pacientes Nuevos',        periodo: '', rango: '', created_at: '' },
      { id: -4, metric_key: 'pacientes_nuevos_anterior',  metric_value: liveMetrics.pacientes_nuevos_anterior,  metric_label: 'Pacientes Mes Anterior',  periodo: '', rango: '', created_at: '' },
      { id: -5, metric_key: 'tasa_retencion',             metric_value: liveMetrics.tasa_seguimiento,           metric_label: 'Continuidad Clínica',     periodo: '', rango: '', created_at: '' },
    ]);

  return (
    <MetricsClient
      initialMetrics={merged}
      initialInsights={insights}
      initialPatientsAtRisk={atRisk}
    />
  );
}
