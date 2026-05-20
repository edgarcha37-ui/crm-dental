import { getPatients } from '@/lib/data/patients';
import PatientsClient, { PatientRow } from './_components/PatientsClient';

// Server Component: pre-renderiza la lista de pacientes con datos reales en el
// primer paint. Sin "Cargando..." flash. La interactividad (búsqueda, filtros,
// modal) vive en el cliente PatientsClient.
//
// Next.js cachea por defecto los Server Components; forzamos no-store porque
// la lista cambia con frecuencia (alta de paciente, actualización, archivado).
export const dynamic = 'force-dynamic';

export default async function PatientsPage() {
  const initialPatients = (await getPatients('activos')) as unknown as PatientRow[];
  return <PatientsClient initialPatients={initialPatients} />;
}
