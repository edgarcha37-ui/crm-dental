'use client';

import { Activity, Calendar, Receipt, StickyNote } from 'lucide-react';
import { EmptyState } from '@/components/patients/utils';
import { AppointmentShape, InvoiceShape, PatientNoteShape } from '@/components/patients/usePatient';

export type TimelineItem =
  | { type: 'cita';    date: Date; data: AppointmentShape }
  | { type: 'factura'; date: Date; data: InvoiceShape }
  | { type: 'nota';    date: Date; data: PatientNoteShape };

interface Props {
  items: TimelineItem[];
}

export default function TimelineTab({ items }: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Historial de Actividades</h2>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Activity size={32} className="text-gray-300" />} text="Sin actividad reciente" />
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
          <div className="space-y-6">
            {items.map((item, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${
                  item.type === 'cita' ? 'bg-blue-100 text-blue-600' :
                  item.type === 'factura' ? 'bg-green-100 text-green-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {item.type === 'cita' && <Calendar size={12} />}
                  {item.type === 'factura' && <Receipt size={12} />}
                  {item.type === 'nota' && <StickyNote size={12} />}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                      {item.type === 'cita' && 'Cita Programada'}
                      {item.type === 'factura' && 'Factura Generada'}
                      {item.type === 'nota' && 'Nota Clínica'}
                    </h4>
                    <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                      {item.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 mt-2">
                    {item.type === 'cita' && (
                      <div className="text-sm">
                        <p className="font-semibold">{item.data.motivo_consulta || item.data.motivo}</p>
                        <p className="text-xs text-gray-500 mt-1">Estatus: <span className="font-medium text-gray-700">{item.data.estado}</span></p>
                      </div>
                    )}
                    {item.type === 'factura' && (
                      <div className="text-sm">
                        <p className="font-semibold text-green-700">${item.data.monto.toLocaleString('es-MX')} MXN</p>
                        <p className="text-xs text-gray-500 mt-1">Referencia: {item.data.numero_factura || `#${item.data.id}`}</p>
                      </div>
                    )}
                    {item.type === 'nota' && (
                      <div className="text-sm">
                        <p className="font-semibold text-gray-800">{item.data.titulo}</p>
                        <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{item.data.contenido}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
