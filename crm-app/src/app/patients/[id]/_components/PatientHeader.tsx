'use client';

import { AlertCircle, Calendar, Edit, MapPin, Phone, Tag, Trash2, User } from 'lucide-react';
import { PatientShape } from '@/components/patients/usePatient';
import { getInitials, calcAge } from '@/components/patients/utils';

interface Props {
  patient: PatientShape;
  onEdit: () => void;
  onArchivar: () => void;
  onDelete: () => void;
}

export default function PatientHeader({ patient, onEdit, onArchivar, onDelete }: Props) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 mb-6">
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
          {getInitials(patient.nombre)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
                {patient.nombre}
                {patient.notas_generales && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md border border-red-200">
                    <AlertCircle size={14} /> Alerta Médica
                  </span>
                )}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Paciente #P-{String(9000 + patient.id).padStart(4, '0')} · Registrado el{' '}
                {new Date(patient.fecha_registro).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--color-border)] rounded-xl hover:bg-gray-50 text-[var(--color-text-secondary)] transition-all">
                <Edit size={15} /> Editar
              </button>
              <button onClick={onArchivar} className={`flex items-center gap-2 px-4 py-2 text-sm border rounded-xl transition-all ${
                patient.archivado
                  ? 'border-green-200 text-green-600 hover:bg-green-50'
                  : 'border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              }`}>
                {patient.archivado ? '↩ Restaurar' : '📁 Archivar Paciente'}
              </button>
              <button
                onClick={onDelete}
                title="Eliminar paciente permanentemente"
                className="flex items-center gap-2 px-4 py-2 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all"
              >
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 mt-4">
            {patient.telefono && <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Phone size={13} className="text-[var(--color-accent-blue)]" />{patient.telefono}</span>}
            {patient.correo && <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><User size={13} className="text-[var(--color-accent-blue)]" />{patient.correo}</span>}
            {patient.fecha_nacimiento && <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Calendar size={13} className="text-[var(--color-accent-blue)]" />{calcAge(patient.fecha_nacimiento)}</span>}
            {patient.direccion && <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><MapPin size={13} className="text-[var(--color-accent-blue)]" />{patient.direccion}</span>}
            {patient.fuente_captacion && <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Tag size={13} className="text-[var(--color-accent-blue)]" />{patient.fuente_captacion}</span>}
          </div>
        </div>
      </div>

      {patient.notas_generales && (
        <div className="mt-5 p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3 items-start shadow-sm">
          <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800 mb-1">Alergias o Condiciones Médicas Importantes</p>
            <p className="text-sm text-red-700 leading-relaxed">{patient.notas_generales}</p>
          </div>
        </div>
      )}
    </div>
  );
}
