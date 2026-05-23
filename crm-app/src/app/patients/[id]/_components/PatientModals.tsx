'use client';

import { X } from 'lucide-react';

interface ModalShellProps {
  onClose: () => void;
  width: string;
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
}
function ModalShell({ onClose, width, title, children, scrollable }: ModalShellProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`bg-white rounded-2xl p-8 ${width} shadow-2xl ${scrollable ? 'max-h-[90vh] overflow-y-auto' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const INPUT_CLS = 'w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20';
const LABEL_CLS = 'block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 uppercase tracking-wider';

// ─────────────────────────────────────────────────────────────────────────────
// NewTreatmentModal
// ─────────────────────────────────────────────────────────────────────────────
interface NewTreatmentForm { clasificacion: string; nombre: string; precio: string }
interface NewTreatmentProps {
  form: NewTreatmentForm;
  setForm: (v: NewTreatmentForm) => void;
  listaTipos: string[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}
export function NewTreatmentModal({ form, setForm, listaTipos, saving, onClose, onSave }: NewTreatmentProps) {
  return (
    <ModalShell onClose={onClose} width="w-[480px]" title="Agregar Tratamiento">
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Clasificación</label>
          <select value={form.clasificacion} onChange={e => setForm({ ...form, clasificacion: e.target.value, nombre: '' })} className={`${INPUT_CLS} bg-white`}>
            <option value="Básico">Básico</option>
            <option value="Especialidad">Especialidad</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Tipo de Tratamiento</label>
          <select value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={`${INPUT_CLS} bg-white`}>
            <option value="">Seleccionar...</option>
            {listaTipos.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Precio ($)</label>
          <input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="0.00" className={INPUT_CLS} />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.nombre} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-bold hover:bg-blue-600 shadow-md disabled:opacity-50 transition-all">{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AbonoModal
// ─────────────────────────────────────────────────────────────────────────────
interface AbonoForm { monto: string; concepto: string }
interface AbonoProps {
  form: AbonoForm;
  setForm: (v: AbonoForm) => void;
  saldo: number;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}
export function AbonoModal({ form, setForm, saldo, saving, onClose, onSave }: AbonoProps) {
  return (
    <ModalShell onClose={onClose} width="w-[420px]" title="Registrar Pago">
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        Saldo actual: <span className="font-bold text-red-500">${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
      </p>
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Monto a Abonar ($)</label>
          <input type="number" min="1" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} className={INPUT_CLS} placeholder="0.00" autoFocus />
        </div>
        <div>
          <label className={LABEL_CLS}>Concepto</label>
          <input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className={INPUT_CLS} placeholder="Ej: Abono de brackets..." />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.monto || parseFloat(form.monto) <= 0} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 shadow-md disabled:opacity-50 transition-all">{saving ? 'Procesando...' : 'Confirmar Pago'}</button>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NewNoteModal
// ─────────────────────────────────────────────────────────────────────────────
interface NoteForm { titulo: string; contenido: string }
interface NoteProps {
  form: NoteForm;
  setForm: (v: NoteForm) => void;
  onClose: () => void;
  onSave: () => void;
}
export function NewNoteModal({ form, setForm, onClose, onSave }: NoteProps) {
  return (
    <ModalShell onClose={onClose} width="w-[500px]" title="Nueva Nota Médica">
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Motivo / Título</label>
          <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className={INPUT_CLS} placeholder="Ej: Control mensual..." />
        </div>
        <div>
          <label className={LABEL_CLS}>Observaciones</label>
          <textarea value={form.contenido} onChange={e => setForm({ ...form, contenido: e.target.value })} className={`${INPUT_CLS} h-32 resize-none`} placeholder="Escribe aquí las notas clínicas..." />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
        <button onClick={onSave} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-bold hover:bg-blue-600 shadow-md transition-all">Guardar Nota</button>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditPatientModal
// ─────────────────────────────────────────────────────────────────────────────
interface EditForm { nombre: string; telefono: string; correo: string; direccion: string; fuente_captacion: string; notas_generales: string }
interface EditProps {
  form: EditForm;
  setForm: (v: EditForm) => void;
  onClose: () => void;
  onSave: () => void;
}
export function EditPatientModal({ form, setForm, onClose, onSave }: EditProps) {
  return (
    <ModalShell onClose={onClose} width="w-[520px]" title="Editar Perfil" scrollable>
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Nombre Completo</label>
          <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={INPUT_CLS} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Teléfono</label>
            <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Correo</label>
            <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} className={INPUT_CLS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Dirección</label>
          <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Alertas Médicas / Alergias</label>
          <textarea value={form.notas_generales} onChange={e => setForm({ ...form, notas_generales: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 h-24 resize-none" placeholder="Alergia a la penicilina, hipertensión..." />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">Cancelar</button>
        <button onClick={onSave} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-bold hover:bg-blue-600 shadow-md transition-all">Guardar Cambios</button>
      </div>
    </ModalShell>
  );
}
