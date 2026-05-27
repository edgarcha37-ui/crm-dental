'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, X, ListTree, ChevronDown, ChevronRight, Printer, Link2, Link2Off } from 'lucide-react';
import { useToast } from '@/components/Toast';

type EstadoPlan = 'Planeado' | 'En Progreso' | 'Completado' | 'Cancelado' | 'Suspendido';
const ALL_STATES: EstadoPlan[] = ['Planeado', 'En Progreso', 'Completado', 'Suspendido', 'Cancelado'];
const STATE_BADGE: Record<EstadoPlan, string> = {
  'Planeado':    'bg-gray-100 text-gray-700',
  'En Progreso': 'bg-blue-50 text-blue-700',
  'Completado':  'bg-green-50 text-green-700',
  'Suspendido':  'bg-orange-50 text-orange-700',
  'Cancelado':   'bg-red-50 text-red-700',
};

interface Plan {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoPlan;
  fecha_inicio: string;
  fecha_estimada_fin: string | null;
  total_treatments: number;
  completed_treatments: number;
  costo_total: number;
  monto_pagado: number;
}

interface Tratamiento {
  id: number;
  nombre: string;
  costo: number;
  monto_pagado: number;
  estatus: string;
  plan_id: number | null;
}

interface Props {
  pacienteId: number;
  pacienteNombre?: string;
}

export default function TreatmentPlansPanel({ pacienteId, pacienteNombre }: Props) {
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allTreatments, setAllTreatments] = useState<Tratamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', fecha_estimada_fin: '' });
  const [saving, setSaving] = useState(false);
  const [quotePlan, setQuotePlan] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, trRes] = await Promise.all([
        fetch(`/api/treatment-plans?paciente_id=${pacienteId}`),
        fetch(`/api/treatments?paciente_id=${pacienteId}`),
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (trRes.ok) {
        const data = await trRes.json();
        setAllTreatments(
          (data as { id: number; nombre?: string; nombre_tratamiento?: string; costo?: number; costo_total?: number; monto_pagado?: number; estatus?: string; plan_id?: number | null }[]).map(t => ({
            id: t.id,
            nombre: t.nombre || t.nombre_tratamiento || 'Sin nombre',
            costo: t.costo ?? t.costo_total ?? 0,
            monto_pagado: t.monto_pagado ?? 0,
            estatus: t.estatus ?? 'Pendiente',
            plan_id: t.plan_id ?? null,
          }))
        );
      }
    } catch {
      toast.error('No se pudieron cargar los planes');
    } finally { setLoading(false); }
  }, [pacienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/treatment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          fecha_estimada_fin: form.fecha_estimada_fin || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      toast.success('Plan creado');
      setShowForm(false);
      setForm({ nombre: '', descripcion: '', fecha_estimada_fin: '' });
      await load();
      setExpandedId(id);
    } catch { toast.error('Error al crear plan'); }
    finally { setSaving(false); }
  }

  async function changeState(id: number, estado: EstadoPlan) {
    try {
      await fetch(`/api/treatment-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      await load();
    } catch { toast.error('Error al cambiar estado'); }
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar este plan? Los tratamientos vinculados quedarán sueltos.')) return;
    try {
      await fetch(`/api/treatment-plans/${id}`, { method: 'DELETE' });
      toast.success('Plan eliminado');
      if (expandedId === id) setExpandedId(null);
      await load();
    } catch { toast.error('Error al eliminar'); }
  }

  async function assignTreatment(treatmentId: number, planId: number) {
    try {
      const res = await fetch(`/api/treatments/${treatmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch { toast.error('Error al asignar tratamiento'); }
  }

  async function unassignTreatment(treatmentId: number) {
    try {
      const res = await fetch(`/api/treatments/${treatmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: null }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch { toast.error('Error al quitar tratamiento'); }
  }

  const planTreatments = (planId: number) => allTreatments.filter(t => t.plan_id === planId);
  const unassigned = allTreatments.filter(t => t.plan_id === null);

  return (
    <>
      <div className="bg-white rounded-xl border border-[var(--color-border-light)] shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListTree size={18} className="text-blue-500" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Planes de Tratamiento</h3>
            <span className="text-xs text-[var(--color-text-muted)] ml-1">({plans.length})</span>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[var(--color-accent-blue)] text-white rounded-lg hover:bg-blue-600 shadow-sm">
            <Plus size={13} /> Nuevo plan
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">Cargando...</p>
        ) : plans.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">Sin planes. Crea uno para agrupar tratamientos y generar cotizaciones.</p>
        ) : (
          <div className="space-y-2">
            {plans.map(p => {
              const isExpanded = expandedId === p.id;
              const pTreatments = planTreatments(p.id);
              const pct = p.total_treatments > 0 ? Math.round((p.completed_treatments / p.total_treatments) * 100) : 0;
              return (
                <div key={p.id} className="rounded-xl border border-[var(--color-border-light)] overflow-hidden">
                  {/* Header del plan */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">{p.nombre}</p>
                        <select
                          value={p.estado}
                          onChange={e => { e.stopPropagation(); changeState(p.id, e.target.value as EstadoPlan); }}
                          onClick={e => e.stopPropagation()}
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer ${STATE_BADGE[p.estado]}`}
                        >
                          {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-[var(--color-text-secondary)]">
                        <span>{p.total_treatments} tratamiento{p.total_treatments !== 1 ? 's' : ''}</span>
                        {p.costo_total > 0 && <span className="font-medium text-[var(--color-text-primary)]">${p.costo_total.toLocaleString('es-MX')}</span>}
                        {p.costo_total > 0 && p.monto_pagado > 0 && <span className="text-green-600">${p.monto_pagado.toLocaleString('es-MX')} abonado</span>}
                      </div>
                      {p.total_treatments > 0 && (
                        <div className="mt-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setQuotePlan(p)}
                        title="Ver cotización"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-gray-50"
                      >
                        <Printer size={13} /> Cotización
                      </button>
                      <button onClick={() => remove(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border-light)] bg-gray-50/50 px-4 py-3 space-y-3">
                      {p.descripcion && (
                        <p className="text-xs text-[var(--color-text-muted)] italic">{p.descripcion}</p>
                      )}

                      {/* Tratamientos del plan */}
                      {pTreatments.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-muted)] text-center py-2">Sin tratamientos en este plan aún.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {pTreatments.map(t => (
                            <div key={t.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[var(--color-border-light)]">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{t.nombre}</p>
                                <p className="text-[11px] text-[var(--color-text-muted)]">{t.estatus}</p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {t.costo > 0 && <span className="text-xs font-bold text-[var(--color-text-primary)]">${t.costo.toLocaleString('es-MX')}</span>}
                                <button
                                  onClick={() => unassignTreatment(t.id)}
                                  title="Quitar del plan"
                                  className="p-1 text-gray-400 hover:text-orange-600 rounded hover:bg-orange-50"
                                >
                                  <Link2Off size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tratamientos no asignados para agregar */}
                      {unassigned.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wide">Agregar al plan</p>
                          <div className="space-y-1">
                            {unassigned.map(t => (
                              <div key={t.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-dashed border-gray-200">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[var(--color-text-secondary)] truncate">{t.nombre}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {t.costo > 0 && <span className="text-xs text-[var(--color-text-muted)]">${t.costo.toLocaleString('es-MX')}</span>}
                                  <button
                                    onClick={() => assignTreatment(t.id, p.id)}
                                    title="Agregar al plan"
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                  >
                                    <Link2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nuevo plan */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Nuevo plan de tratamiento</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nombre del plan *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Ortodoncia 2026, Rehabilitación oral..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Descripción (opcional)</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={3} placeholder="Objetivos, fases, observaciones..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Fecha estimada de fin (opcional)</label>
                <input type="date" value={form.fecha_estimada_fin} onChange={e => setForm({ ...form, fecha_estimada_fin: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 disabled:opacity-60">Cancelar</button>
                <button onClick={create} disabled={!form.nombre.trim() || saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 shadow-md disabled:opacity-60">
                  {saving ? 'Creando...' : 'Crear plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cotización */}
      {quotePlan && (
        <QuotationModal
          plan={quotePlan}
          treatments={planTreatments(quotePlan.id)}
          pacienteNombre={pacienteNombre || 'Paciente'}
          onClose={() => setQuotePlan(null)}
        />
      )}
    </>
  );
}

function QuotationModal({ plan, treatments, pacienteNombre, onClose }: {
  plan: Plan;
  treatments: Tratamiento[];
  pacienteNombre: string;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const subtotal = treatments.reduce((s, t) => s + t.costo, 0);
  const abonado = treatments.reduce((s, t) => s + t.monto_pagado, 0);
  const saldo = Math.max(0, subtotal - abonado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden-overlay">
      <style>{`
        @media print {
          body > *:not(#quotation-print-root) { display: none !important; }
          #quotation-print-root { position: fixed; inset: 0; background: white; padding: 2rem; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="quotation-print-root" className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-auto">
        {/* Toolbar */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-[var(--color-text-primary)]">Cotización</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--color-accent-blue)] text-white rounded-xl hover:bg-blue-600 shadow-sm"
            >
              <Printer size={15} /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div className="px-8 py-6 space-y-6">
          <div className="text-center border-b border-gray-200 pb-5">
            <h1 className="text-2xl font-bold text-gray-900">Cotización de Tratamiento</h1>
            <p className="text-sm text-gray-500 mt-1">{today}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paciente</p>
              <p className="font-bold text-gray-900">{pacienteNombre}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Plan</p>
              <p className="font-bold text-gray-900">{plan.nombre}</p>
              {plan.descripcion && <p className="text-gray-500 text-xs mt-0.5">{plan.descripcion}</p>}
            </div>
          </div>

          {treatments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Este plan no tiene tratamientos asignados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-700">Tratamiento</th>
                  <th className="text-center py-2 font-semibold text-gray-700">Estado</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Costo</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map(t => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-900">{t.nombre}</td>
                    <td className="py-2.5 text-center text-gray-500 text-xs">{t.estatus}</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {t.costo > 0 ? `$${t.costo.toLocaleString('es-MX')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={2} className="pt-3 font-semibold text-gray-700">Subtotal</td>
                  <td className="pt-3 text-right font-bold text-gray-900">${subtotal.toLocaleString('es-MX')}</td>
                </tr>
                {abonado > 0 && (
                  <tr>
                    <td colSpan={2} className="pt-1 text-green-700 text-sm">Pagado</td>
                    <td className="pt-1 text-right text-green-700 font-medium">−${abonado.toLocaleString('es-MX')}</td>
                  </tr>
                )}
                <tr className="bg-blue-50 rounded-lg">
                  <td colSpan={2} className="pt-2 pb-2 pl-2 font-bold text-blue-900 text-base rounded-l-lg">Saldo pendiente</td>
                  <td className="pt-2 pb-2 pr-2 text-right font-bold text-blue-900 text-base rounded-r-lg">${saldo.toLocaleString('es-MX')}</td>
                </tr>
              </tfoot>
            </table>
          )}

          <p className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
            Esta cotización es informativa y puede estar sujeta a cambios según evolución del tratamiento.
          </p>
        </div>
      </div>
    </div>
  );
}
