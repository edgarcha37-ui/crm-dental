'use client';

import { useEffect, useState } from 'react';
import { Save, Check } from 'lucide-react';
import { useToast } from './Toast';

type ToothEstado = 'sano' | 'caries' | 'restauracion' | 'extraccion' | 'corona' | 'implante' | 'endodoncia' | 'ausente';

interface ToothState {
  estado: ToothEstado;
  notas?: string;
  fecha?: string;
}

// Numeración FDI (Federation Dentaire Internationale). Filas en pares cuadrante-superior, cuadrante-inferior.
const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT  = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_LEFT  = ['38', '37', '36', '35', '34', '33', '32', '31'].reverse(); // 31..38 izq→der
const LOWER_RIGHT = ['41', '42', '43', '44', '45', '46', '47', '48'];

const UPPER = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER = [...LOWER_LEFT, ...LOWER_RIGHT];

const ESTADO_COLOR: Record<ToothEstado, { fill: string; border: string; label: string }> = {
  sano:         { fill: 'fill-white',       border: 'stroke-gray-400',  label: 'Sano' },
  caries:       { fill: 'fill-red-200',     border: 'stroke-red-500',   label: 'Caries' },
  restauracion: { fill: 'fill-blue-200',    border: 'stroke-blue-500',  label: 'Restauración' },
  endodoncia:   { fill: 'fill-purple-200',  border: 'stroke-purple-500',label: 'Endodoncia' },
  corona:       { fill: 'fill-yellow-200',  border: 'stroke-yellow-500',label: 'Corona' },
  implante:     { fill: 'fill-green-300',   border: 'stroke-green-600', label: 'Implante' },
  extraccion:   { fill: 'fill-gray-300',    border: 'stroke-gray-700',  label: 'Extracción' },
  ausente:      { fill: 'fill-transparent', border: 'stroke-gray-300',  label: 'Ausente' },
};

const ESTADOS_ORDER: ToothEstado[] = ['sano', 'caries', 'restauracion', 'endodoncia', 'corona', 'implante', 'extraccion', 'ausente'];

interface Props {
  pacienteId: number;
}

export default function Odontograma({ pacienteId }: Props) {
  const toast = useToast();
  const [dientes, setDientes] = useState<Record<string, ToothState>>({});
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/patients/${pacienteId}/odontograma`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDientes(data.dientes || {});
        setObservaciones(data.observaciones || '');
      } catch {
        toast.error('No se pudo cargar el odontograma');
      } finally { setLoading(false); }
    }
    load();
  }, [pacienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  function getTooth(fdi: string): ToothState {
    return dientes[fdi] || { estado: 'sano' };
  }

  function setToothEstado(fdi: string, estado: ToothEstado) {
    setDientes(prev => ({
      ...prev,
      [fdi]: { ...prev[fdi], estado, fecha: new Date().toISOString().split('T')[0] },
    }));
  }

  async function save() {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/patients/${pacienteId}/odontograma`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dientes, observaciones: observaciones || null }),
      });
      if (!res.ok) throw new Error();
      setSaveState('saved');
      toast.success('Odontograma guardado');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      toast.error('Error al guardar odontograma');
      setSaveState('idle');
    }
  }

  if (loading) return <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">Cargando odontograma...</p>;

  const selected = selectedTooth ? getTooth(selectedTooth) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Odontograma</h3>
        <button
          onClick={save}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm disabled:opacity-60 ${
            saveState === 'saved' ? 'bg-green-500 text-white' : 'bg-[var(--color-accent-blue)] text-white hover:bg-blue-600'
          }`}
        >
          {saveState === 'saved' ? <Check size={12} /> : <Save size={12} />}
          {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {ESTADOS_ORDER.map(e => (
          <div key={e} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-white">
            <span className={`inline-block w-3 h-3 rounded-sm ${ESTADO_COLOR[e].fill} border ${ESTADO_COLOR[e].border.replace('stroke-', 'border-')}`} />
            <span className="text-[var(--color-text-secondary)]">{ESTADO_COLOR[e].label}</span>
          </div>
        ))}
      </div>

      {/* Grid de dientes */}
      <div className="bg-gradient-to-b from-blue-50/50 to-white border border-blue-100 rounded-2xl p-4">
        {/* Mandíbula superior */}
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 mb-1">
          {UPPER.map(fdi => (
            <ToothCell key={fdi} fdi={fdi} state={getTooth(fdi)} selected={selectedTooth === fdi} onSelect={() => setSelectedTooth(fdi)} />
          ))}
        </div>
        {/* Línea media */}
        <div className="h-px bg-blue-200 my-2" />
        {/* Mandíbula inferior */}
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
          {LOWER.map(fdi => (
            <ToothCell key={fdi} fdi={fdi} state={getTooth(fdi)} selected={selectedTooth === fdi} onSelect={() => setSelectedTooth(fdi)} />
          ))}
        </div>
      </div>

      {/* Editor del diente seleccionado */}
      {selectedTooth && selected && (
        <div className="p-4 rounded-xl border border-[var(--color-border-light)] bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">Diente {selectedTooth}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{toothLabel(selectedTooth)}</p>
            </div>
            <button onClick={() => setSelectedTooth(null)} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {ESTADOS_ORDER.map(e => (
              <button
                key={e}
                onClick={() => setToothEstado(selectedTooth, e)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected.estado === e
                    ? 'bg-[var(--color-accent-blue)] text-white border-blue-600 shadow-sm'
                    : 'bg-white text-[var(--color-text-secondary)] border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`inline-block w-3 h-3 rounded-sm ${ESTADO_COLOR[e].fill} border ${ESTADO_COLOR[e].border.replace('stroke-', 'border-')}`} />
                {ESTADO_COLOR[e].label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Notas del diente</label>
            <input
              type="text"
              value={selected.notas || ''}
              onChange={e => setDientes(prev => ({ ...prev, [selectedTooth]: { ...prev[selectedTooth], estado: prev[selectedTooth]?.estado || 'sano', notas: e.target.value } }))}
              placeholder="Ej. Cara oclusal, profundidad..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Observaciones generales</label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={2}
          placeholder="Observaciones del odontograma..."
          className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 resize-none"
        />
      </div>
    </div>
  );
}

function ToothCell({ fdi, state, selected, onSelect }: { fdi: string; state: ToothState; selected: boolean; onSelect: () => void }) {
  const colors = ESTADO_COLOR[state.estado];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-center group relative ${selected ? 'ring-2 ring-blue-500 ring-offset-1 rounded-md' : ''}`}
      title={`${fdi} — ${colors.label}`}
    >
      <span className="text-[9px] text-gray-500 font-medium mb-0.5">{fdi}</span>
      <svg viewBox="0 0 20 26" className="w-full h-auto max-w-[28px]">
        {/* Forma simplificada del diente */}
        <path
          d="M3 5 Q3 0 10 0 Q17 0 17 5 L18 14 Q18 22 13 24 Q10 26 10 26 Q10 26 7 24 Q2 22 2 14 Z"
          className={`${colors.fill} ${colors.border}`}
          strokeWidth="1.5"
        />
        {state.estado === 'extraccion' && (
          <>
            <line x1="3" y1="3" x2="17" y2="23" stroke="rgb(55, 65, 81)" strokeWidth="1.5" />
            <line x1="17" y1="3" x2="3" y2="23" stroke="rgb(55, 65, 81)" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </button>
  );
}

function toothLabel(fdi: string): string {
  const cuad = fdi[0];
  const num = fdi[1];
  const cuadrante = { '1': 'Sup. Derecho', '2': 'Sup. Izquierdo', '3': 'Inf. Izquierdo', '4': 'Inf. Derecho' }[cuad] || '';
  const nombres: Record<string, string> = {
    '1': 'Incisivo central', '2': 'Incisivo lateral', '3': 'Canino',
    '4': '1er Premolar', '5': '2do Premolar', '6': '1er Molar',
    '7': '2do Molar', '8': '3er Molar (muela del juicio)',
  };
  return `${cuadrante} · ${nombres[num] || ''}`;
}
