'use client';

import { useEffect, useState } from 'react';
import { Search, Bell, Plus, Calendar, ChevronLeft, ChevronRight, Users, Receipt, ArrowUpRight, ArrowDownRight, Clock, FileText, FlaskConical, AlertTriangle, CheckCircle, Activity, User } from 'lucide-react';

interface Appointment {
  id: number;
  paciente_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  estado: string;
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ revenue: 4250, newPatients: 12, todayAppointments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [appointmentsRes, statsRes] = await Promise.all([
          fetch(`/api/appointments?fecha=${today}`),
          fetch('/api/patients?stats=true'),
        ]);

        const appointmentsData = await appointmentsRes.json();
        const statsData = await statsRes.json();

        setAppointments(appointmentsData);
        setStats({
          revenue: 4250,
          newPatients: statsData.newThisMonth || 12,
          todayAppointments: appointmentsData.length,
        });
      } catch (error) {
        console.error('Error al cargar datos del panel:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const bookedHours = appointments.map(a => a.hora_inicio);
  const totalSlots = 14; // 9am to 4pm every 30 mins approx
  const availableSlots = totalSlots - appointments.length;
  const occupancyPercentage = Math.round((appointments.length / totalSlots) * 100);

  const confirmadas = appointments.filter(a => a.estado === 'Confirmada').length;
  const pendientes = appointments.filter(a => a.estado === 'Pendiente').length;

  const proximoPaciente = appointments.find(a => a.estado === 'Confirmada' || a.estado === 'Pendiente');

  const labStatus = [
    { id: 1, paciente: 'Juan P.', trabajo: 'Prótesis Completa', estado: 'En camino', type: 'warning' },
    { id: 2, paciente: 'María G.', trabajo: 'Corona Zirconia', estado: 'Listo para colocar', type: 'success' },
    { id: 3, paciente: 'Carlos R.', trabajo: 'Guarda Oclusal', estado: 'Retrasado', type: 'error' }
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Medical Cockpit</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Centro de control operativo y clínico del día.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar paciente, expediente..."
              className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] transition-all"
            />
          </div>
          <button className="relative p-2.5 rounded-xl bg-white border border-[var(--color-border)] hover:bg-gray-50 transition-all">
            <Bell size={20} className="text-[var(--color-text-secondary)]" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent-red)] rounded-full text-[10px] text-white flex items-center justify-center font-bold">2</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
            <Plus size={18} />
            Agendar Cita
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Optimizadas */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {/* Ingresos */}
        <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-t-4 border-t-green-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Ingresos del Día</p>
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} /> +12% vs ayer
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">${stats.revenue.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-secondary)]">
            <Receipt size={14} className="text-green-500" />
            <span>4 Pagos procesados</span>
          </div>
        </div>

        {/* Pacientes Nuevos */}
        <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-t-4 border-t-blue-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Pacientes Nuevos</p>
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} /> +2 esta semana
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.newPatients}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--color-text-secondary)]">
            <Users size={14} className="text-blue-500" />
            <span>3 Prospectos en espera</span>
          </div>
        </div>

        {/* Ocupación de Agenda */}
        <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-t-4 border-t-purple-500 col-span-2">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Ocupación de Agenda (Hoy)</p>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {stats.todayAppointments} de {totalSlots} espacios
            </span>
          </div>
          
          <div className="flex items-end gap-4 mt-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1 font-medium text-[var(--color-text-secondary)]">
                <span>{occupancyPercentage}% Ocupado</span>
                <span>{availableSlots} Libres</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${occupancyPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex gap-3 text-xs font-medium border-l border-gray-200 pl-4">
              <div className="text-center">
                <p className="text-green-600">{confirmadas}</p>
                <p className="text-[10px] text-gray-500">Conf.</p>
              </div>
              <div className="text-center">
                <p className="text-yellow-600">{pendientes}</p>
                <p className="text-[10px] text-gray-500">Pend.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal a 2 Columnas (Cockpit) */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Agenda y Oportunidades */}
        <div className="col-span-2 space-y-6">
          
          {/* Daily Summary & Opportunities */}
          <div className="bg-blue-50 border border-blue-100 rounded-[var(--radius-card)] p-5 flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600 mt-1">
              <Activity size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 mb-1">Oportunidades del Día</h3>
              <p className="text-xs text-blue-800 mb-3 leading-relaxed">
                Hoy: <strong>{confirmadas} Citas Confirmadas</strong> | <strong>{pendientes} Pendientes</strong> | <strong>{availableSlots} Espacios Libres</strong>.
              </p>
              {availableSlots > 0 && (
                <div className="bg-white rounded-lg p-3 text-xs text-[var(--color-text-secondary)] border border-blue-100 shadow-sm flex items-center justify-between">
                  <span>💡 <strong>Sugerencia:</strong> Tienes {availableSlots} espacios libres. Recomendamos contactar a <strong>Martín Gómez</strong> para su seguimiento de limpieza postergado.</span>
                  <button className="text-blue-600 font-bold px-3 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors">Contactar</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">Flujo de Pacientes</h2>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <span className="text-xs font-bold text-gray-600">HOY</span>
                <button className="p-1.5 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all">
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-[var(--color-border-light)]">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">Cargando agenda...</div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-[var(--color-text-muted)] flex flex-col items-center">
                  <Calendar size={32} className="opacity-20 mb-3" />
                  <p className="text-sm">Agenda vacía para hoy</p>
                </div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-16 text-center flex-shrink-0">
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{apt.hora_inicio}</p>
                      <p className="text-[10px] text-gray-400">{apt.hora_fin}</p>
                    </div>
                    
                    <div className="w-1 h-10 rounded-full bg-blue-400"></div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate">{apt.paciente_nombre}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <FileText size={12} /> {apt.motivo}
                      </p>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${
                        apt.estado === 'Confirmada' ? 'bg-green-100 text-green-700' :
                        apt.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {apt.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Contexto Pro */}
        <div className="col-span-1 space-y-6">
          
          {/* Próximo Paciente Widget */}
          <div className="bg-slate-900 rounded-[var(--radius-card)] p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <User size={100} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center gap-2">
                <Clock size={12} className="text-blue-400" /> Próximo Paciente
              </p>
              
              {proximoPaciente ? (
                <>
                  <h3 className="text-xl font-bold mb-1">{proximoPaciente.paciente_nombre}</h3>
                  <p className="text-sm text-slate-300 mb-4">{proximoPaciente.motivo} • {proximoPaciente.hora_inicio}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
                    <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                      <p className="text-slate-400 mb-0.5">Última Visita</p>
                      <p className="font-semibold text-slate-200">Hace 3 meses</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                      <p className="text-slate-400 mb-0.5">Deuda</p>
                      <p className="font-semibold text-green-400">$0.00</p>
                    </div>
                  </div>

                  <button className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-md">
                    Ver Expediente Clínico
                  </button>
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-400">No hay pacientes en sala de espera.</p>
                </div>
              )}
            </div>
          </div>

          {/* Estatus de Laboratorio Widget */}
          <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] border border-[var(--color-border-light)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border-light)] flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <FlaskConical size={16} className="text-purple-500" />
                Estatus de Laboratorio
              </h3>
            </div>
            <div className="p-3">
              {labStatus.map(lab => (
                <div key={lab.id} className="p-3 flex items-start gap-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                  <div className="mt-0.5">
                    {lab.type === 'warning' && <Clock size={16} className="text-yellow-500" />}
                    {lab.type === 'success' && <CheckCircle size={16} className="text-green-500" />}
                    {lab.type === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{lab.trabajo}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Paciente: {lab.paciente}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      lab.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      lab.type === 'success' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {lab.estado}
                    </span>
                  </div>
                </div>
              ))}
              
              <button className="w-full mt-2 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                Ver todos los trabajos
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
