'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';

interface Appointment {
    id: number;
    paciente_nombre: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    motivo: string;
    estado: string;
}

const VIEWS = ['Día', 'Semana', 'Mes'] as const;
type ViewType = typeof VIEWS[number];
const hours = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

const STATUS_COLORS: Record<string, string> = {
    'Confirmada': 'bg-blue-100 border-blue-300 text-blue-700',
    'Pendiente': 'bg-yellow-100 border-yellow-300 text-yellow-700',
    'Completada': 'bg-green-100 border-green-300 text-green-700',
    'Cancelada': 'bg-red-100 border-red-300 text-red-700',
    'No Asistió': 'bg-gray-100 border-gray-300 text-gray-700',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getWeekDates(date: Date): Date[] {
    const start = new Date(date);
    const day = start.getDay();
    // Lunes como primer día
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
}

function getMonthDates(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Empezar desde el lunes de la semana del primer día
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const start = new Date(firstDay);
    start.setDate(start.getDate() - startOffset);
    // 6 semanas = 42 días
    return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
}

function getAppointmentPosition(apt: Appointment) {
    const [startH, startM] = apt.hora_inicio.split(':').map(Number);
    const [endH, endM] = apt.hora_fin.split(':').map(Number);
    const top = ((startH - 7) * 60 + startM) * (64 / 60);
    const height = ((endH - startH) * 60 + (endM - startM)) * (64 / 60);
    return { top: `${top}px`, height: `${Math.max(height, 28)}px` };
}

function dateStr(d: Date) { return d.toISOString().split('T')[0]; }

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState<ViewType>('Semana');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAppointments() {
            try {
                // Para vista mes/semana traemos más rango; para día solo ese día
                const res = await fetch('/api/appointments');
                const data = await res.json();
                setAppointments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error citas:', err);
            } finally { setLoading(false); }
        }
        fetchAppointments();
    }, []);

    function navigate(dir: number) {
        const d = new Date(currentDate);
        if (activeView === 'Día') d.setDate(d.getDate() + dir);
        else if (activeView === 'Semana') d.setDate(d.getDate() + dir * 7);
        else d.setMonth(d.getMonth() + dir);
        setCurrentDate(d);
    }

    const today = dateStr(new Date());
    const weekDates = getWeekDates(currentDate);
    const monthDates = getMonthDates(currentDate);

    // Título dinámico según vista
    function headerTitle() {
        if (activeView === 'Día') return currentDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (activeView === 'Semana') {
            const start = weekDates[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
            const end = weekDates[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
            return `${start} – ${end}`;
        }
        return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    // ── VISTA DÍA ──────────────────────────────────────────────
    function DayView() {
        const dayApts = appointments.filter(a => a.fecha === dateStr(currentDate));
        return (
            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
                <div className="grid grid-cols-2 border-b border-[var(--color-border-light)]">
                    <div className="p-3 text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wider"/>
                    <div className={`p-3 text-center border-l border-[var(--color-border-light)] ${today === dateStr(currentDate) ? 'bg-blue-50/50' : ''}`}>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">{currentDate.toLocaleDateString('es-MX',{weekday:'long'})}</p>
                        <p className={`text-2xl font-bold mt-0.5 ${today === dateStr(currentDate) ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-primary)]'}`}>{currentDate.getDate()}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 relative" style={{ minHeight: '768px' }}>
                    <div className="border-r border-[var(--color-border-light)]">
                        {hours.map(h => <div key={h} className="h-16 px-3 flex items-start pt-1"><span className="text-[10px] text-[var(--color-text-muted)] font-medium">{h}</span></div>)}
                    </div>
                    <div className={`relative ${today === dateStr(currentDate) ? 'bg-blue-50/20' : ''}`}>
                        {hours.map(h => <div key={h} className="h-16 border-b border-[var(--color-border-light)]"/>)}
                        {dayApts.map(apt => {
                            const pos = getAppointmentPosition(apt);
                            return (
                                <div key={apt.id} className={`absolute left-2 right-2 rounded-lg px-2 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-all border-l-4 ${STATUS_COLORS[apt.estado]||'bg-gray-100 border-gray-300 text-gray-700'}`} style={{top:pos.top,height:pos.height,borderLeftWidth:'4px'}}>
                                    <p className="text-xs font-bold truncate">{apt.paciente_nombre}</p>
                                    <p className="text-[10px] opacity-70">{apt.hora_inicio} - {apt.hora_fin} · {apt.motivo}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ── VISTA SEMANA ──────────────────────────────────────────
    function WeekView() {
        return (
            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
                <div className="grid grid-cols-8 border-b border-[var(--color-border-light)]">
                    <div className="p-3"/>
                    {weekDates.map((date, i) => {
                        const isToday = dateStr(date) === today;
                        return (
                            <div key={i} className={`p-3 text-center border-l border-[var(--color-border-light)] ${isToday ? 'bg-blue-50/50' : ''}`}>
                                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wider">{DAY_NAMES[i]}</p>
                                <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-primary)]'}`}>{date.getDate()}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-8 relative" style={{ minHeight: '768px' }}>
                    <div className="border-r border-[var(--color-border-light)]">
                        {hours.map(h => <div key={h} className="h-16 px-3 flex items-start pt-1"><span className="text-[10px] text-[var(--color-text-muted)] font-medium">{h}</span></div>)}
                    </div>
                    {weekDates.map((date, dayIdx) => {
                        const ds = dateStr(date);
                        const dayApts = appointments.filter(a => a.fecha === ds);
                        const isToday = ds === today;
                        return (
                            <div key={dayIdx} className={`border-l border-[var(--color-border-light)] relative ${isToday ? 'bg-blue-50/20' : ''}`}>
                                {hours.map(h => <div key={h} className="h-16 border-b border-[var(--color-border-light)]"/>)}
                                {dayApts.map(apt => {
                                    const pos = getAppointmentPosition(apt);
                                    return (
                                        <div key={apt.id} className={`absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-all ${STATUS_COLORS[apt.estado]||'bg-gray-100 border-gray-300 text-gray-700'}`} style={{top:pos.top,height:pos.height,borderLeftWidth:'3px'}}>
                                            <p className="text-[10px] font-bold truncate">{apt.paciente_nombre}</p>
                                            <p className="text-[9px] opacity-70 truncate">{apt.hora_inicio} - {apt.hora_fin}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── VISTA MES ──────────────────────────────────────────────
    function MonthView() {
        const currentMonth = currentDate.getMonth();
        return (
            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
                {/* Encabezado días semana */}
                <div className="grid grid-cols-7 border-b border-[var(--color-border-light)]">
                    {DAY_NAMES.map(d => <div key={d} className="p-3 text-center text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wider">{d}</div>)}
                </div>
                {/* Celdas del mes */}
                <div className="grid grid-cols-7">
                    {monthDates.map((date, i) => {
                        const ds = dateStr(date);
                        const isToday = ds === today;
                        const isCurrentMonth = date.getMonth() === currentMonth;
                        const dayApts = appointments.filter(a => a.fecha === ds);
                        return (
                            <div key={i} className={`min-h-[100px] p-2 border-b border-r border-[var(--color-border-light)] ${isToday ? 'bg-blue-50/40' : ''} ${!isCurrentMonth ? 'bg-gray-50/60' : ''}`}>
                                <p className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--color-accent-blue)] text-white' : isCurrentMonth ? 'text-[var(--color-text-primary)]' : 'text-gray-300'}`}>
                                    {date.getDate()}
                                </p>
                                <div className="space-y-0.5">
                                    {dayApts.slice(0, 3).map(apt => (
                                        <div key={apt.id} className={`text-[9px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer ${STATUS_COLORS[apt.estado]||'bg-gray-100 text-gray-700'}`}>
                                            {apt.hora_inicio} {apt.paciente_nombre}
                                        </div>
                                    ))}
                                    {dayApts.length > 3 && <p className="text-[9px] text-[var(--color-text-muted)] pl-1">+{dayApts.length - 3} más</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Citas</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white transition-all">
                            <ChevronLeft size={18} className="text-[var(--color-text-muted)]"/>
                        </button>
                        <span className="text-sm font-medium text-[var(--color-text-primary)] min-w-[220px] text-center capitalize">{headerTitle()}</span>
                        <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-white transition-all">
                            <ChevronRight size={18} className="text-[var(--color-text-muted)]"/>
                        </button>
                    </div>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium text-[var(--color-accent-blue)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-all">
                        Hoy
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {VIEWS.map(v => (
                            <button key={v} onClick={() => setActiveView(v)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeView === v ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
                        <Plus size={18}/> Nueva Cita
                    </button>
                </div>
            </div>

            {/* Vista activa */}
            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin"/></div>
            ) : (
                <>
                    {activeView === 'Día' && <DayView/>}
                    {activeView === 'Semana' && <WeekView/>}
                    {activeView === 'Mes' && <MonthView/>}
                </>
            )}

            {/* Resumen — solo Confirmadas y Pendientes */}
            <div className="grid grid-cols-2 gap-4 mt-6">
                {[
                    { estado: 'Confirmada', label: 'Confirmadas', color: 'bg-blue-50 text-[var(--color-accent-blue)]' },
                    { estado: 'Pendiente',  label: 'Pendientes',  color: 'bg-yellow-50 text-yellow-600' },
                ].map(({ estado, label, color }) => {
                    const count = appointments.filter(a => a.estado === estado).length;
                    return (
                        <div key={estado} className="bg-white rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)] flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                                <Calendar size={18}/>
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
                                <p className="text-xl font-bold text-[var(--color-text-primary)]">{count}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
