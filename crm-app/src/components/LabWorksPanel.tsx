'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Plus, X, Clock, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import PatientAutocomplete, { AutocompletePatient } from './PatientAutocomplete';

type LabEstado = 'En camino' | 'Listo para colocar' | 'Retrasado' | 'Colocado' | 'Cancelado';

interface LabWork {
  id: number;
  paciente_id: number | null;
  trabajo: string;
  laboratorio: string | null;
  estado: LabEstado;
  fecha_envio: string | null;
  fecha_estimada: string | null;
  paciente_nombre?: string;
}

const ACTIVE_STATES: LabEstado[] = ['En camino', 'Listo para colocar', 'Retrasado'];
const ALL_STATES: LabEstado[] = ['En camino', 'Listo para colocar', 'Retrasado', 'Colocado', 'Cancelado'];

const STATE_STYLES: Record<LabEstado, { badge: string; icon: typeof Clock }> = {
  'En camino':         { badge: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'Listo para colocar':{ badge: 'bg-green-100 text-green-700',   icon: CheckCircle },
  'Retrasado':         { badge: 'bg-red-100 text-red-700',       icon: AlertTriangle },
  'Colocado':          { badge: 'bg-gray-100 text-gray-700',     icon: CheckCircle },
  'Cancelado':         { badge: 'bg-gray-100 text-gray-500',     icon: X },
};

export default function LabWorksPanel() {
  const [works, setWorks] = useState<LabWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [paciente, setPaciente] = useState<AutocompletePatient | null>(null);
  const [form, setForm] = useState({ trabajo: '', laboratorio: '', fecha_estimada: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/lab-works');
      const data = await res.json();
      setWorks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Lab works load:', e);
      setWorks([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.trabajo.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/lab-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajo: form.trabajo.trim(),
          laboratorio: form.laboratorio.trim() || null,
          fecha_estimada: form.fecha_estimada || null,
          paciente_id: paciente?.id ?? null,
          estado: 'En camino',
        }),
      });
      setShowModal(false);
      setForm({ trabajo: '', laboratorio: '', fecha_estimada: '' });
      setPaciente(null);
      await load();
    } finally { setSaving(false); }
  }

  async function changeState(id: number, estado: LabEstado) {
    await fetch(`/api/lab-works/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm('¿Eliminar este trabajo de laboratorio?')) return;
    await fetch(`/api/lab-works/${id}`, { method: 'DELETE' });
    await load();
  }

  const activos = works.filter(w => ACTIVE_STATES.includes(w.estado));
  const cerrados = works.filter(w => !ACTIVE_STATES.includes(w.estado));

  return (
    <>
      <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-purple-500" />
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Trabajos de Laboratorio</h2>
            <span className="text-xs text-[var(--color-text-muted)] ml-1">({activos.length} activos)</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-blue)] text-white rounded-xl text-xs font-medium hover:bg-blue-600 transition-all shadow-sm"
          >
            <Plus size={14} /> Nuevo trabajo
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">Cargando...</p>
          ) : works.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">Sin trabajos de laboratorio registrados.</p>
          ) : (
            <div className="space-y-2">
              {[...activos, ...cerrados].map(w => {
                const Style = STATE_STYLES[w.estado];
                const Icon = Style.icon;
                return (
                  <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border-light)]">
                    <Icon size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{w.trabajo}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {w.paciente_nombre || 'Sin paciente'}
                        {w.laboratorio ? ` · ${w.laboratorio}` : ''}
                        {w.fecha_estimada ? ` · Estimado: ${new Date(w.fecha_estimada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}` : ''}
                      </p>
                    </div>
                    <select
                      value={w.estado}
                      onChange={e => changeState(w.id, e.target.value as LabEstado)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border-0 focus:outline-none ${Style.badge}`}
                    >
                      {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => remove(w.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Nuevo trabajo de laboratorio</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Paciente (opcional)</label>
                <PatientAutocomplete value={paciente} onChange={setPaciente} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Trabajo</label>
                <input
                  type="text"
                  value={form.trabajo}
                  onChange={e => setForm({ ...form, trabajo: e.target.value })}
                  placeholder="Ej. Corona Zirconia, Guarda Oclusal..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Laboratorio</label>
                  <input
                    type="text"
                    value={form.laboratorio}
                    onChange={e => setForm({ ...form, laboratorio: e.target.value })}
                    placeholder="Nombre del laboratorio"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Fecha estimada</label>
                  <input
                    type="date"
                    value={form.fecha_estimada}
                    onChange={e => setForm({ ...form, fecha_estimada: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={create}
                  disabled={!form.trabajo.trim() || saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 shadow-md disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Crear trabajo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
