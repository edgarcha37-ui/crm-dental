'use client';

import { useEffect, useState } from 'react';
import { Plus, X, ListTree, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/Toast';

type EstadoPlan = 'Planeado' | 'En Progreso' | 'Completado' | 'Cancelado' | 'Suspendido';
const ALL_STATES: EstadoPlan[] = ['Planeado', 'En Progreso', 'Completado', 'Suspendido', 'Cancelado'];

const STATE_BADGE: Record<EstadoPlan, string> = {
  'Planeado':     'bg-gray-100 text-gray-700',
  'En Progreso':  'bg-blue-50 text-blue-700',
  'Completado':   'bg-green-50 text-green-700',
  'Suspendido':   'bg-orange-50 text-orange-700',
  'Cancelado':    'bg-red-50 text-red-700',
};

interface Plan {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoPlan;
  fecha_inicio: string;
  fecha_estimada_fin: string | null;
  total_treatments?: number;
  completed_treatments?: number;
  costo_total?: number;
  monto_pagado?: number;
}

interface Props {
  pacienteId: number;
}

export default function TreatmentPlansPanel({ pacienteId }: Props) {
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', fecha_estimada_fin: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/treatment-plans?paciente_id=${pacienteId}`);
      if (!res.ok) throw new Error();
      setPlans(await res.json());
    } catch {
      toast.error('No se pudieron cargar los planes');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [pacienteId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      toast.success('Plan creado');
      setShowForm(false);
      setForm({ nombre: '', descripcion: '', fecha_estimada_fin: '' });
      await load();
    } catch {
      toast.error('Error al crear plan');
    } finally { setSaving(false); }
  }

  async function changeState(id: number, estado: EstadoPlan) {
    try {
      const res = await fetch(`/api/treatment-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch { toast.error('Error al cambiar estado'); }
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar este plan? Los tratamientos vinculados quedarán sueltos.')) return;
    try {
      const res = await fetch(`/api/treatment-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Plan eliminado');
      await load();
    } catch { toast.error('Error al eliminar'); }
  }

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
          <p className="text-xs text-[var(--color-text-muted)] py-3 text-center">Sin planes. Crea uno para agrupar varios tratamientos con su progreso.</p>
        ) : (
          <div className="space-y-2">
            {plans.map(p => {
              const total = p.total_treatments ?? 0;
              const completed = p.completed_treatments ?? 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              const costo = p.costo_total ?? 0;
              const pagado = p.monto_pagado ?? 0;
              return (
                <div key={p.id} className="p-4 rounded-xl border border-[var(--color-border-light)] hover:shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{p.nombre}</p>
                        <select
                          value={p.estado}
                          onChange={e => changeState(p.id, e.target.value as EstadoPlan)}
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border-0 focus:outline-none ${STATE_BADGE[p.estado]}`}
                        >
                          {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {p.descripcion && <p className="text-xs text-[var(--color-text-muted)] mb-2">{p.descripcion}</p>}
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                          <ChevronRight size={12} /> {completed}/{total} pasos completados
                        </span>
                        {costo > 0 && (
                          <span className="text-[var(--color-text-secondary)]">
                            ${pagado.toLocaleString('es-MX')} / ${costo.toLocaleString('es-MX')}
                          </span>
                        )}
                      </div>
                      {total > 0 && (
                        <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-600 text-xs">
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Nuevo plan de tratamiento</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nombre del plan</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Ortodoncia 2026, Rehabilitación oral..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Descripción (opcional)</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Objetivos, fases, observaciones..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Fecha estimada de fin (opcional)</label>
                <input type="date" value={form.fecha_estimada_fin} onChange={e => setForm({ ...form, fecha_estimada_fin: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
                  Cancelar
                </button>
                <button onClick={create} disabled={!form.nombre.trim() || saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 shadow-md disabled:opacity-60">
                  {saving ? 'Creando...' : 'Crear plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
