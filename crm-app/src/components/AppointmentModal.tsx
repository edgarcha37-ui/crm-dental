'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, Clock, FileText, Stethoscope } from 'lucide-react';
import PatientAutocomplete, { AutocompletePatient } from './PatientAutocomplete';
import { useToast } from './Toast';

interface Doctor {
  id: number | null;
  nombre: string;
  especialidad?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  /** Valores iniciales si se abre desde un slot del calendario. */
  initialFecha?: string;       // YYYY-MM-DD
  initialHoraInicio?: string;  // HH:MM
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AppointmentModal({ open, onClose, onCreated, initialFecha, initialHoraInicio }: Props) {
  const toast = useToast();
  const [paciente, setPaciente] = useState<AutocompletePatient | null>(null);
  const [fecha, setFecha] = useState(initialFecha || todayISO());
  const [horaInicio, setHoraInicio] = useState(initialHoraInicio || '09:00');
  const [duracion, setDuracion] = useState(30);
  const [motivo, setMotivo] = useState('');
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset state cada vez que se abre.
    setPaciente(null);
    setFecha(initialFecha || todayISO());
    setHoraInicio(initialHoraInicio || '09:00');
    setDuracion(30);
    setMotivo('');
    setError(null);
    // Carga doctores + perfil del titular en paralelo.
    Promise.all([
      fetch('/api/doctors').then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/settings').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([doctorsData, settings]: [Doctor[], { perfil?: { nombre?: string; especialidad?: string } } | null]) => {
      const titular: Doctor[] =
        settings?.perfil?.nombre
          ? [{ id: null, nombre: settings.perfil.nombre, especialidad: settings.perfil.especialidad || null }]
          : [];
      // Evitar duplicado si el titular ya existe en la tabla doctors con el mismo nombre.
      const filtered = (doctorsData as Doctor[]).filter(
        d => !titular.length || d.nombre.toLowerCase() !== titular[0].nombre.toLowerCase()
      );
      const merged = [...titular, ...filtered];
      setDoctors(merged);
      if (merged.length > 0) setDoctorId(merged[0].id);
    });
  }, [open, initialFecha, initialHoraInicio]);

  if (!open) return null;

  const horaFin = addMinutes(horaInicio, duracion);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!paciente) { setError('Selecciona un paciente'); return; }
    if (!motivo.trim()) { setError('Indica el motivo de la cita'); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: paciente.id,
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo: motivo.trim(),
          estado: 'Pendiente',
          duracion,
          doctor_id: doctorId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      toast.success(`Cita agendada para ${paciente.nombre} el ${fecha} a las ${horaInicio}`);
      onCreated?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar la cita';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Nueva Cita</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Paciente</label>
            <PatientAutocomplete value={paciente} onChange={setPaciente} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Calendar size={12} /> Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Clock size={12} /> Hora inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={e => setHoraInicio(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Duración</label>
              <select
                value={duracion}
                onChange={e => setDuracion(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
              >
                {DURATION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Hora fin</label>
              <input
                type="text"
                value={horaFin}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-gray-50 text-sm text-[var(--color-text-muted)]"
              />
            </div>
          </div>

          {doctors.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Stethoscope size={12} /> Doctor
              </label>
              <select
                value={doctorId ?? ''}
                onChange={e => setDoctorId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
              >
                {doctors.map((d, i) => (
                  <option key={d.id ?? `owner-${i}`} value={d.id ?? ''}>{d.nombre}{d.especialidad ? ` — ${d.especialidad}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 flex items-center gap-1.5">
              <FileText size={12} /> Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Limpieza, revisión, ortodoncia..."
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">{error}</div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 shadow-md disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Agendar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
