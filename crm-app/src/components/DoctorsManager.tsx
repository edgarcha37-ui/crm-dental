'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Check, X, Power } from 'lucide-react';
import { useToast } from './Toast';
import type { Doctor } from '@/types';

interface DoctorForm {
  nombre: string;
  especialidad: string;
  cedula: string;
  correo: string;
  telefono: string;
  activo: boolean;
}

const EMPTY: DoctorForm = { nombre: '', especialidad: '', cedula: '', correo: '', telefono: '', activo: true };

export default function DoctorsManager() {
  const toast = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctors?incluir_inactivos=true');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setDoctors(await res.json());
    } catch (e) {
      console.error('Load doctors:', e);
      toast.error('No se pudieron cargar los doctores');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(d: Doctor) {
    setEditing(d);
    setForm({
      nombre: d.nombre,
      especialidad: d.especialidad || '',
      cedula: d.cedula || '',
      correo: d.correo || '',
      telefono: d.telefono || '',
      activo: d.activo,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({
        nombre: form.nombre.trim(),
        especialidad: form.especialidad.trim() || null,
        cedula: form.cedula.trim() || null,
        correo: form.correo.trim() || null,
        telefono: form.telefono.trim() || null,
        activo: form.activo,
      });
      const res = editing
        ? await fetch(`/api/doctors/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
        : await fetch('/api/doctors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `Error ${res.status}`);
      }
      toast.success(editing ? 'Doctor actualizado' : 'Doctor agregado');
      setShowForm(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(d: Doctor) {
    try {
      const res = await fetch(`/api/doctors/${d.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !d.activo }),
      });
      if (!res.ok) throw new Error();
      toast.success(d.activo ? 'Doctor inactivado' : 'Doctor reactivado');
      await load();
    } catch {
      toast.error('Error al cambiar estado');
    }
  }

  async function remove(d: Doctor) {
    if (!confirm(`¿Eliminar a ${d.nombre}? Esta acción no se puede deshacer. Si tiene citas asociadas, se mantendrán pero sin doctor.`)) return;
    try {
      const res = await fetch(`/api/doctors/${d.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Doctor eliminado');
      await load();
    } catch {
      toast.error('Error al eliminar');
    }
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Doctores</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Gestiona el equipo clínico que puede atender citas</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
          <Plus size={16} /> Nuevo doctor
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Cargando...</div>
      ) : doctors.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Aún no hay doctores. Agrega el primero.</div>
      ) : (
        <div className="space-y-2">
          {doctors.map(d => (
            <div key={d.id} className={`flex items-center gap-4 p-4 rounded-xl border ${d.activo ? 'border-[var(--color-border-light)]' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {d.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                  {d.nombre}
                  {!d.activo && <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-500">(inactivo)</span>}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {d.especialidad || 'Sin especialidad'}{d.cedula ? ` · Céd. ${d.cedula}` : ''}{d.correo ? ` · ${d.correo}` : ''}
                </p>
              </div>
              <button onClick={() => toggleActivo(d)} className={`p-2 rounded-lg ${d.activo ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`} title={d.activo ? 'Inactivar' : 'Reactivar'}>
                <Power size={15} />
              </button>
              <button onClick={() => openEdit(d)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50" title="Editar">
                <Edit size={15} />
              </button>
              <button onClick={() => remove(d)} className="p-2 rounded-lg text-red-600 hover:bg-red-50" title="Eliminar">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-light)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{editing ? 'Editar doctor' : 'Nuevo doctor'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nombre completo *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Dr. Aris Thorne"
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Especialidad</label>
                  <input type="text" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value })}
                    placeholder="Cirujano Dental"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Cédula profesional</label>
                  <input type="text" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })}
                    placeholder="12345678"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Correo</label>
                  <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })}
                    placeholder="doctor@clinica.mx"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+52 55 1234 5678"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20" />
                </div>
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} className="w-4 h-4" />
                  Activo (aparece en selector de citas)
                </label>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 disabled:opacity-60">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? 'Guardando...' : <><Check size={14} /> {editing ? 'Guardar cambios' : 'Crear doctor'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
