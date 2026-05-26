'use client';

import { useEffect, useState } from 'react';
import { Heart, Pill, Activity, Save, Check, Plus, X, Droplet, AlertCircle } from 'lucide-react';

interface Props {
  pacienteId: number;
}

type ListField = 'alergias' | 'medicamentos_cronicos' | 'padecimientos';

interface HistoryState {
  alergias: string[];
  medicamentos_cronicos: string[];
  padecimientos: string[];
  tipo_sangre: string;
  notas_clinicas: string;
}

const EMPTY: HistoryState = {
  alergias: [],
  medicamentos_cronicos: [],
  padecimientos: [],
  tipo_sangre: '',
  notas_clinicas: '',
};

const BLOOD_TYPES = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const FIELDS: { key: ListField; label: string; icon: typeof Heart; placeholder: string; color: string }[] = [
  { key: 'alergias',              label: 'Alergias',                icon: AlertCircle, placeholder: 'Ej. Penicilina, látex...',  color: 'text-red-600 bg-red-50' },
  { key: 'medicamentos_cronicos', label: 'Medicamentos crónicos',   icon: Pill,        placeholder: 'Ej. Losartan 50mg',          color: 'text-blue-600 bg-blue-50' },
  { key: 'padecimientos',         label: 'Padecimientos',           icon: Activity,    placeholder: 'Ej. Hipertensión, diabetes', color: 'text-amber-700 bg-amber-50' },
];

export default function MedicalHistoryEditor({ pacienteId }: Props) {
  const [history, setHistory] = useState<HistoryState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [newItem, setNewItem] = useState<Record<ListField, string>>({ alergias: '', medicamentos_cronicos: '', padecimientos: '' });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/patients/${pacienteId}/medical-history`);
        if (!res.ok) return;
        const data = await res.json();
        setHistory({
          alergias: data.alergias || [],
          medicamentos_cronicos: data.medicamentos_cronicos || [],
          padecimientos: data.padecimientos || [],
          tipo_sangre: data.tipo_sangre || '',
          notas_clinicas: data.notas_clinicas || '',
        });
      } catch (e) {
        console.error('Load medical history:', e);
      } finally { setLoading(false); }
    }
    load();
  }, [pacienteId]);

  function addItem(field: ListField) {
    const value = newItem[field].trim();
    if (!value) return;
    setHistory(prev => ({ ...prev, [field]: [...prev[field], value] }));
    setNewItem(prev => ({ ...prev, [field]: '' }));
  }

  function removeItem(field: ListField, idx: number) {
    setHistory(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  }

  async function save() {
    // Auto-agregar cualquier texto pendiente en los inputs antes de guardar.
    const pending = { ...newItem };
    const extra: Partial<HistoryState> = {};
    for (const key of ['alergias', 'medicamentos_cronicos', 'padecimientos'] as ListField[]) {
      if (pending[key].trim()) {
        extra[key] = [...history[key], pending[key].trim()];
      }
    }
    const finalHistory = extra ? { ...history, ...extra } : history;
    if (Object.keys(extra).length > 0) {
      setHistory(finalHistory);
      setNewItem(prev => ({ ...prev, ...Object.fromEntries(Object.keys(extra).map(k => [k, ''])) } as Record<ListField, string>));
    }

    setSaveState('saving');
    try {
      const res = await fetch(`/api/patients/${pacienteId}/medical-history`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alergias: finalHistory.alergias,
          medicamentos_cronicos: finalHistory.medicamentos_cronicos,
          padecimientos: finalHistory.padecimientos,
          tipo_sangre: finalHistory.tipo_sangre || null,
          notas_clinicas: finalHistory.notas_clinicas || null,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      console.error('Save medical history:', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  if (loading) return <p className="text-xs text-[var(--color-text-muted)] py-3">Cargando historia clínica...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <Heart size={16} className="text-red-500" /> Historia clínica
        </h3>
        <button
          onClick={save}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-60 ${
            saveState === 'saved' ? 'bg-green-500 text-white' :
            saveState === 'error' ? 'bg-red-500 text-white' :
            'bg-[var(--color-accent-blue)] text-white hover:bg-blue-600'
          }`}
        >
          {saveState === 'saved' ? <Check size={12} /> : <Save size={12} />}
          {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? 'Guardado' : saveState === 'error' ? 'Error' : 'Guardar'}
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1.5">
          <Droplet size={12} className="text-red-500" /> Tipo de sangre
        </label>
        <select
          value={history.tipo_sangre}
          onChange={e => setHistory(prev => ({ ...prev, tipo_sangre: e.target.value }))}
          className="w-32 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
        >
          {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt || '— Sin especificar —'}</option>)}
        </select>
      </div>

      {FIELDS.map(({ key, label, icon: Icon, placeholder, color }) => (
        <div key={key}>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
            <Icon size={12} /> {label}
          </label>
          {history[key].length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {history[key].map((item, idx) => (
                <span key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                  {item}
                  <button onClick={() => removeItem(key, idx)} className="hover:bg-black/10 rounded-full p-0.5" aria-label={`Quitar ${item}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItem[key]}
              onChange={e => setNewItem(prev => ({ ...prev, [key]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(key); } }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
            />
            <button
              onClick={() => addItem(key)}
              disabled={!newItem[key].trim()}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[var(--color-text-secondary)] disabled:opacity-50"
              aria-label="Agregar"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Notas clínicas adicionales</label>
        <textarea
          value={history.notas_clinicas}
          onChange={e => setHistory(prev => ({ ...prev, notas_clinicas: e.target.value }))}
          rows={3}
          placeholder="Antecedentes familiares, observaciones..."
          className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 resize-none"
        />
      </div>
    </div>
  );
}
