'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Campos destino que aceptamos en la BD.
const TARGET_FIELDS = [
  { key: '__ignore__',     label: '— Ignorar —' },
  { key: 'nombre',         label: 'Nombre (requerido)' },
  { key: 'telefono',       label: 'Teléfono' },
  { key: 'correo',         label: 'Correo' },
  { key: 'direccion',      label: 'Dirección' },
  { key: 'fecha_nacimiento', label: 'Fecha nacimiento (YYYY-MM-DD)' },
  { key: 'sexo',           label: 'Sexo' },
  { key: 'fuente_captacion', label: 'Fuente captación' },
  { key: 'notas_generales', label: 'Notas / alergias' },
] as const;

type TargetField = (typeof TARGET_FIELDS)[number]['key'];

// Parser CSV simple: maneja comillas, comas dentro de comillas, y CRLF.
// No usamos lib para no inflar el bundle por una feature puntual.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(cell); cell = ''; }
      else if (c === '\n') { cur.push(cell); rows.push(cur); cur = []; cell = ''; }
      else if (c === '\r') { /* ignore */ }
      else cell += c;
    }
  }
  if (cell.length > 0 || cur.length > 0) { cur.push(cell); rows.push(cur); }
  return rows.filter(r => r.some(v => v.trim().length > 0));
}

function guessField(header: string): TargetField {
  const h = header.toLowerCase().trim();
  if (/(^|\W)(nombre|name|paciente)/.test(h)) return 'nombre';
  if (/(tel|phone|cel|móvil|movil)/.test(h)) return 'telefono';
  if (/(correo|email|mail)/.test(h)) return 'correo';
  if (/(direcc|address|domicilio)/.test(h)) return 'direccion';
  if (/(nacim|birth|dob|fecha_nac)/.test(h)) return 'fecha_nacimiento';
  if (/(sexo|genero|gender)/.test(h)) return 'sexo';
  if (/(fuente|source|captacion)/.test(h)) return 'fuente_captacion';
  if (/(notas|alergias|notes|observaciones)/.test(h)) return 'notas_generales';
  return '__ignore__';
}

type ImportResult = {
  total: number;
  created: number;
  errors: { row: number; nombre?: string; message: string }[];
};

export default function PatientsImport({ open, onClose, onImported }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, TargetField>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setRows([]); setHeaders([]); setMapping({}); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast.error('El CSV no tiene filas suficientes');
        return;
      }
      const [headerRow, ...dataRows] = parsed;
      setHeaders(headerRow);
      setRows(dataRows);
      const auto: Record<number, TargetField> = {};
      headerRow.forEach((h, i) => { auto[i] = guessField(h); });
      setMapping(auto);
    };
    reader.readAsText(file);
  }

  const nombreColIdx = Object.entries(mapping).find(([, v]) => v === 'nombre')?.[0];
  const hasNombre = nombreColIdx !== undefined;

  async function submit() {
    if (!hasNombre) { toast.error('Asigna una columna a "Nombre"'); return; }
    setSubmitting(true);
    try {
      // Construye filas { nombre, telefono, ... } basadas en mapping.
      const payload = rows.map(r => {
        const obj: Record<string, string | null> = {};
        Object.entries(mapping).forEach(([col, target]) => {
          if (target === '__ignore__') return;
          const value = (r[Number(col)] || '').trim();
          obj[target] = value || null;
        });
        return obj;
      }).filter(r => r.nombre); // descarta filas sin nombre

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setResult(data as ImportResult);
      if (data.created > 0) {
        toast.success(`${data.created} paciente${data.created === 1 ? '' : 's'} importado${data.created === 1 ? '' : 's'}`);
        onImported();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al importar');
    } finally { setSubmitting(false); }
  }

  if (!open) return null;
  const preview = rows.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-green-600" /> Importar pacientes desde CSV
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
                <CheckCircle size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800">{result.created} de {result.total} pacientes importados</p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-green-700 mt-0.5">{result.errors.length} fila(s) tuvieron error.</p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 max-h-48 overflow-auto">
                  <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1"><AlertCircle size={12} /> Errores:</p>
                  <ul className="text-xs text-red-700 space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i}>· Fila {e.row}{e.nombre ? ` (${e.nombre})` : ''}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { reset(); }} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Importar otro</button>
                <button onClick={onClose} className="px-4 py-2 text-sm bg-[var(--color-accent-blue)] text-white rounded-xl hover:bg-blue-600 shadow-md">Cerrar</button>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-xl p-10 text-center cursor-pointer transition-all"
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Arrastra tu CSV aquí o haz click para seleccionar</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Primera fila debe ser el encabezado. Máx. 500 filas.</p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                ref={fileRef}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div className="text-xs text-[var(--color-text-muted)] bg-gray-50 rounded-xl p-3 border border-[var(--color-border-light)]">
                <p className="font-bold text-[var(--color-text-secondary)] mb-1">Formato esperado:</p>
                <code className="block">nombre,telefono,correo,fecha_nacimiento</code>
                <code className="block">Juan Pérez,5512345678,juan@x.com,1985-03-22</code>
                <p className="mt-2">Los encabezados se mapean automáticamente y puedes ajustar el mapeo abajo.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)] mb-3">
                  Mapeo de columnas <span className="text-xs text-[var(--color-text-muted)] font-normal">({rows.length} filas detectadas)</span>
                </p>
                <div className="space-y-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-xs font-mono px-2 py-1 bg-white rounded border border-gray-200 text-gray-700 min-w-[140px] truncate">{h || `Col ${i + 1}`}</span>
                      <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                      <select
                        value={mapping[i] ?? '__ignore__'}
                        onChange={e => setMapping({ ...mapping, [i]: e.target.value as TargetField })}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                      >
                        {TARGET_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)] mb-2">Vista previa (primeras 5 filas)</p>
                <div className="overflow-auto rounded-xl border border-[var(--color-border-light)]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                            {h || `Col ${i + 1}`}
                            <span className="block text-[10px] text-blue-600 font-bold">
                              → {TARGET_FIELDS.find(f => f.key === mapping[i])?.label || 'Ignorar'}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, ri) => (
                        <tr key={ri} className="border-t border-[var(--color-border-light)]">
                          {headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 whitespace-nowrap text-[var(--color-text-secondary)]">{r[ci]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!hasNombre && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> Debes asignar una columna al campo &ldquo;Nombre&rdquo; para continuar.
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button onClick={reset} disabled={submitting} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60">
                  Volver
                </button>
                <button onClick={submit} disabled={!hasNombre || submitting} className="px-4 py-2 text-sm bg-[var(--color-accent-blue)] text-white rounded-xl hover:bg-blue-600 shadow-md disabled:opacity-60 flex items-center gap-2">
                  {submitting ? 'Importando...' : `Importar ${rows.length} pacientes`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
