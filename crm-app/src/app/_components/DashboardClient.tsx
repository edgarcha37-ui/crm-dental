'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Plus, Calendar, ChevronLeft, ChevronRight, Users, Receipt, ArrowUpRight, ArrowDownRight, Clock, FileText, Activity, User, FlaskConical, AlertTriangle, CheckCircle } from 'lucide-react';
import AppointmentModal from '@/components/AppointmentModal';
import GlobalSearch from '@/components/GlobalSearch';
import { useRouter } from 'next/navigation';

export interface DashboardAppointment {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  estado: string;
}

export interface DashboardStats {
  ingresosMes: number;
  ingresosMesAnterior: number;
  pacientesNuevos: number;
  pacientesNuevosAnterior: number;
}

export interface DashboardLabWork {
  id: number;
  trabajo: string;
  paciente_nombre?: string;
  estado: 'En camino' | 'Listo para colocar' | 'Retrasado' | 'Colocado' | 'Cancelado';
}

interface Props {
  initialAppointments: DashboardAppointment[];
  initialStats: DashboardStats;
  initialLabWorks: DashboardLabWork[];
}

export default function DashboardClient({ initialAppointments, initialStats, initialLabWorks }: Props) {
  const router = useRouter();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Estado deriva de props server-rendered; al crear cita usamos router.refresh()
  // para re-pedir al server (que vuelve a llamar getAppointments+getLiveMetrics+getActiveLabWorks).
  const appointments = initialAppointments;
  const stats = initialStats;
  const labWorks = initialLabWorks;

  const ingresosDelta = stats.ingresosMesAnterior > 0
    ? Math.round(((stats.ingresosMes - stats.ingresosMesAnterior) / stats.ingresosMesAnterior) * 100)
    : null;
  const pacientesDelta = stats.pacientesNuevos - stats.pacientesNuevosAnterior;

  const totalSlots = 14;
  const availableSlots = totalSlots - appointments.length;
  const occupancyPercentage = Math.round((appointments.length / totalSlots) * 100);

  const confirmadas = appointments.filter(a => a.estado === 'Confirmada').length;
  const pendientes = appointments.filter(a => a.estado === 'Pendiente').length;
  const proximoPaciente = appointments.find(a => a.estado === 'Confirmada' || a.estado === 'Pendiente');

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Medical Cockpit</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Centro de control operativo y clínico del día.</p>
        </div>
        <div className="flex items-center gap-4">
          <GlobalSearch />
          <button className="relative p-2.5 rounded-xl bg-white border border-[var(--color-border)] hover:bg-gray-50 transition-all">
            <Bell size={20} className="text-[var(--color-text-secondary)]" />
          </button>
          <button
            onClick={() => setShowAppointmentModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md"
          >
            <Plus size={18} />
            Agendar Cita
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-t-4 border-t-green-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Ingresos del Mes</p>
            {ingresosDelta !== null && (
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                ingresosDelta >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                {ingresosDelta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {ingresosDelta >= 0 ? '+' : ''}{ingresosDelta}% vs mes anterior
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">${stats.ingresosMes.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-secondary)]">
            <Receipt size={14} className="text-green-500" />
            <span>Facturas pagadas este mes</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-t-4 border-t-blue-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Pacientes Nuevos</p>
            {pacientesDelta !== 0 && (
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pacientesDelta >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'
              }`}>
                {pacientesDelta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {pacientesDelta >= 0 ? '+' : ''}{pacientesDelta} vs mes anterior
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.pacientesNuevos}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-secondary)]">
            <Users size={14} className="text-blue-500" />
            <span>Registrados este mes</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-t-4 border-t-purple-500 col-span-2">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Ocupación de Agenda (Hoy)</p>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {appointments.length} de {totalSlots} espacios
            </span>
          </div>
          <div className="flex items-end gap-4 mt-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1 font-medium text-[var(--color-text-secondary)]">
                <span>{occupancyPercentage}% Ocupado</span>
                <span>{availableSlots} Libres</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${occupancyPercentage}%` }} />
              </div>
            </div>
            <div className="flex gap-3 text-xs font-medium border-l border-gray-200 pl-4">
              <div className="text-center"><p className="text-green-600">{confirmadas}</p><p className="text-[10px] text-gray-500">Conf.</p></div>
              <div className="text-center"><p className="text-yellow-600">{pendientes}</p><p className="text-[10px] text-gray-500">Pend.</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-[var(--radius-card)] p-5 flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600 mt-1"><Activity size={24} /></div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 mb-1">Oportunidades del Día</h3>
              <p className="text-xs text-blue-800 leading-relaxed">
                Hoy: <strong>{confirmadas} Citas Confirmadas</strong> | <strong>{pendientes} Pendientes</strong> | <strong>{availableSlots} Espacios Libres</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Flujo de Pacientes</h2>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100"><ChevronLeft size={16} className="text-gray-600" /></button>
                <span className="text-xs font-bold text-gray-600">HOY</span>
                <button className="p-1.5 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100"><ChevronRight size={16} className="text-gray-600" /></button>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-light)]">
              {appointments.length === 0 ? (
                <div className="p-12 text-center text-[var(--color-text-muted)] flex flex-col items-center">
                  <Calendar size={32} className="opacity-20 mb-3" />
                  <p className="text-sm">Agenda vacía para hoy</p>
                </div>
              ) : appointments.map((apt) => (
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-16 text-center flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{apt.hora_inicio}</p>
                    <p className="text-[10px] text-gray-400">{apt.hora_fin}</p>
                  </div>
                  <div className="w-1 h-10 rounded-full bg-blue-400"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate">{apt.paciente_nombre}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><FileText size={12} /> {apt.motivo}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${
                      apt.estado === 'Confirmada' ? 'bg-green-100 text-green-700' :
                      apt.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{apt.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-[var(--radius-card)] p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><User size={100} /></div>
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center gap-2">
                <Clock size={12} className="text-blue-400" /> Próximo Paciente
              </p>
              {proximoPaciente ? (
                <>
                  <h3 className="text-xl font-bold mb-1">{proximoPaciente.paciente_nombre}</h3>
                  <p className="text-sm text-slate-300 mb-5">{proximoPaciente.motivo} • {proximoPaciente.hora_inicio}</p>
                  <Link href={`/patients/${proximoPaciente.paciente_id}`} className="block w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl text-center transition-all shadow-md">
                    Ver Expediente Clínico
                  </Link>
                </>
              ) : (
                <div className="py-6 text-center"><p className="text-sm text-slate-400">No hay pacientes en sala de espera.</p></div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] border border-[var(--color-border-light)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <FlaskConical size={16} className="text-purple-500" />
                Estatus de Laboratorio
              </h3>
              <Link href="/notes" className="text-[10px] font-bold text-blue-600 hover:underline">VER TODOS</Link>
            </div>
            <div className="p-3">
              {labWorks.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-3 py-4 text-center">Sin trabajos activos.</p>
              ) : labWorks.map(lab => {
                const isRetrasado = lab.estado === 'Retrasado';
                const isListo = lab.estado === 'Listo para colocar';
                return (
                  <div key={lab.id} className="p-3 flex items-start gap-3 border-b border-gray-100 last:border-0 rounded-lg">
                    <div className="mt-0.5">
                      {isRetrasado ? <AlertTriangle size={16} className="text-red-500" />
                        : isListo ? <CheckCircle size={16} className="text-green-500" />
                        : <Clock size={16} className="text-yellow-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{lab.trabajo}</p>
                      {lab.paciente_nombre && (
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">Paciente: {lab.paciente_nombre}</p>
                      )}
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isRetrasado ? 'bg-red-100 text-red-700' :
                        isListo ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {lab.estado}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AppointmentModal
        open={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
