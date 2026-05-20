import { getInvoices, getInvoiceStats, Invoice as DBInvoice } from '@/lib/data/invoices';
import BillingClient from './_components/BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  // SC: paralelo invoices + stats. El cliente recibe el initial set para "Todas".
  const [invoicesRaw, stats] = await Promise.all([
    getInvoices(),
    getInvoiceStats(),
  ]);

  // El cliente espera el shape histórico (con paciente_nombre, tratamiento_nombre).
  // getInvoices ya los añade vía el join.
  const initialInvoices = invoicesRaw.map((i: DBInvoice) => ({
    id: i.id,
    paciente_id: i.paciente_id ?? 0,
    paciente_nombre: i.paciente_nombre || '',
    tratamiento_nombre: i.tratamiento_nombre || '',
    razon_social: i.razon_social || '',
    rfc: i.rfc || '',
    direccion_fiscal: i.direccion_fiscal || '',
    uso_cfdi: i.uso_cfdi || '',
    monto: i.monto,
    fecha: i.fecha,
    numero_factura: i.numero_factura || '',
    estatus: i.estatus,
  }));

  return <BillingClient initialInvoices={initialInvoices} initialStats={stats} />;
}
