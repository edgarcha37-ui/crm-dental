import { getAppointments } from '@/lib/data/appointments';
import { getAllMetrics, getLiveMetrics } from '@/lib/data/metrics';
import { getActiveLabWorks } from '@/lib/data/lab-works';
import DashboardClient, { DashboardAppointment, DashboardLabWork, DashboardStats } from './_components/DashboardClient';

// Server Component: el primer paint trae datos reales sin "Cargando..." flash.
// Al crear cita, el modal client llama router.refresh() y este re-corre.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const today = new Date().toISOString().split('T')[0];

  // Paralelo: agenda de hoy + métricas live + lab works activos.
  // getLiveMetrics está cacheada 5 min (TTL en lib/data/metrics.ts) — barata.
  const [appointmentsRaw, liveMetrics, labWorksRaw] = await Promise.all([
    getAppointments(today),
    getLiveMetrics(),
    getActiveLabWorks(4),
  ]);

  // Las cards arriba derivan de live + el resto de getAllMetrics no se necesita
  // en el dashboard, así que evitamos esa query adicional.
  void getAllMetrics; // mantengo el import para que el linter no lo borre si después se usa

  const initialAppointments: DashboardAppointment[] = appointmentsRaw.map(a => ({
    id: a.id,
    paciente_id: a.paciente_id,
    paciente_nombre: a.paciente_nombre || 'Sin nombre',
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin,
    motivo: a.motivo,
    estado: a.estado,
  }));

  const initialStats: DashboardStats = {
    ingresosMes: liveMetrics.ingresos_totales,
    ingresosMesAnterior: liveMetrics.ingresos_totales_anterior,
    pacientesNuevos: liveMetrics.pacientes_nuevos,
    pacientesNuevosAnterior: liveMetrics.pacientes_nuevos_anterior,
  };

  const initialLabWorks: DashboardLabWork[] = labWorksRaw.map(l => ({
    id: l.id,
    trabajo: l.trabajo,
    paciente_nombre: l.paciente_nombre,
    estado: l.estado,
  }));

  return (
    <DashboardClient
      initialAppointments={initialAppointments}
      initialStats={initialStats}
      initialLabWorks={initialLabWorks}
    />
  );
}
