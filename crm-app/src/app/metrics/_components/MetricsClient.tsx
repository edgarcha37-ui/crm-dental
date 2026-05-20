'use client';

import { useState, useMemo } from 'react';
import { Search, Bell, TrendingUp, TrendingDown, Users, CalendarDays, DollarSign, Activity, AlertCircle, Lightbulb, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';

interface Metric {
    id: number;
    metric_key: string;
    metric_value: number;
    metric_label: string;
    periodo: string;
    rango: string;
}

interface Insight {
    id: number;
    fecha: string;
    categoria: 'Marketing' | 'Operaciones' | 'Retención';
    titulo: string;
    contenido: string;
    accion_sugerida: string | null;
    visto: boolean;
}

interface PatientAtRisk {
    id: number;
    nombre: string;
    telefono: string;
    ticket: number;
    diasSinVisita: number;
}

type DateFilter = '3M' | '6M' | '12M';

interface Props {
    initialMetrics: Metric[];
    initialInsights: Insight[];
    initialPatientsAtRisk: PatientAtRisk[];
}

export default function MetricsClient({ initialMetrics, initialInsights, initialPatientsAtRisk }: Props) {
    const [metrics, setMetrics] = useState<Metric[]>(initialMetrics);
    const [insights, setInsights] = useState<Insight[]>(initialInsights);
    const [patientsAtRisk] = useState<PatientAtRisk[]>(initialPatientsAtRisk);
    const [loading] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>('12M');
    void setMetrics; void setInsights;

    const markInsightAsSeen = async (id: number) => {
        try {
            await fetch('/api/insights', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            setInsights(insights.map(i => i.id === id ? { ...i, visto: true } : i));
        } catch (error) {
            console.error('Error marcando insight como visto:', error);
        }
    };

    // --- KPIs ---
    const getMetricValue = (key: string) => metrics.find(m => m.metric_key === key)?.metric_value || 0;
    const revenue = getMetricValue('ingresos_totales');
    const prevRevenue = getMetricValue('ingresos_totales_anterior');
    const newPatients = getMetricValue('pacientes_nuevos');
    const prevPatients = getMetricValue('pacientes_nuevos_anterior');
    
    // Nuevos KPIs de retención
    const retentionRate = getMetricValue('tasa_retencion');
    const noShowRate = getMetricValue('noshow_rate');

    const revenueChange = prevRevenue ? (((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : '0';
    const patientsChange = prevPatients ? (((newPatients - prevPatients) / prevPatients) * 100).toFixed(1) : '0';

    // --- Gráficas y Filtros ---
    const filterDataByMonths = (data: Metric[], months: number) => {
        return [...data].sort((a, b) => a.periodo.localeCompare(b.periodo)).slice(-months);
    };

    const monthsCount = dateFilter === '3M' ? 3 : dateFilter === '6M' ? 6 : 12;

    const revenueByMonth = useMemo(() => {
        const raw = metrics.filter(m => m.metric_key === 'revenue_mensual');
        return filterDataByMonths(raw, monthsCount).map(m => ({
            name: m.metric_label,
            revenue: m.metric_value,
        }));
    }, [metrics, dateFilter, monthsCount]);

    const growthTrend = useMemo(() => {
        const raw = metrics.filter(m => m.metric_key === 'growth_trend');
        return filterDataByMonths(raw, monthsCount).map(m => ({
            name: m.metric_label,
            patients: m.metric_value,
        }));
    }, [metrics, dateFilter, monthsCount]);

    const channelsData = useMemo(() => {
        return metrics.filter(m => m.metric_key === 'canal_adquisicion').map(m => ({
            name: m.metric_label,
            value: m.metric_value,
        }));
    }, [metrics]);

    const COLORS = ['#4A90D9', '#805AD5', '#38B2AC', '#F6AD55'];

    // --- Tratamientos Populares ---
    const popularTreatments = metrics.filter(m => m.metric_key === 'tratamiento_popular').sort((a, b) => b.metric_value - a.metric_value);
    const maxTreatment = Math.max(...popularTreatments.map(t => t.metric_value), 1);
    const treatmentColors = ['bg-[#4A90D9]', 'bg-[#805AD5]', 'bg-[#38B2AC]', 'bg-[#F6AD55]', 'bg-[#E53E3E]'];
    const treatmentIcons = ['🦷', '✨', '✅', '🔧', '🦴'];

    if (loading) {
        return <div className="p-8 flex items-center justify-center h-[50vh] text-[var(--color-text-muted)]">Cargando métricas de Business Intelligence...</div>;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Encabezado y Filtros */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Inteligencia de Negocio</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Visión estratégica y analítica clínica</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                        {(['3M', '6M', '12M'] as DateFilter[]).map(filter => (
                            <button 
                                key={filter}
                                onClick={() => setDateFilter(filter)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${dateFilter === filter ? 'bg-white shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Smart Insights Section */}
            {insights.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Lightbulb size={20} className="text-[var(--color-accent-yellow)]" />
                        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Smart Insights</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {insights.map(insight => (
                            <div key={insight.id} className={`bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] border-l-4 ${insight.categoria === 'Marketing' ? 'border-[var(--color-accent-purple)]' : insight.categoria === 'Retención' ? 'border-[var(--color-accent-red)]' : 'border-[var(--color-accent-blue)]'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${insight.categoria === 'Marketing' ? 'bg-purple-50 text-purple-700' : insight.categoria === 'Retención' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {insight.categoria}
                                        </span>
                                        {!insight.visto && (
                                            <span className="w-2 h-2 rounded-full bg-[var(--color-accent-blue)]"></span>
                                        )}
                                    </div>
                                    {!insight.visto && (
                                        <button onClick={() => markInsightAsSeen(insight.id)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Marcar leído</button>
                                    )}
                                </div>
                                <h3 className="font-bold text-[var(--color-text-primary)] mb-1">{insight.titulo}</h3>
                                <p className="text-sm text-[var(--color-text-secondary)] mb-3">{insight.contenido}</p>
                                {insight.accion_sugerida && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <p className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                                            <TrendingUp size={14} className="text-[var(--color-accent-green)]" />
                                            Sugerencia: <span className="font-normal text-[var(--color-text-secondary)]">{insight.accion_sugerida}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tarjetas KPI Principales */}
            <div className="grid grid-cols-4 gap-5 mb-8">
                <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <DollarSign size={22} className="text-[var(--color-accent-blue)]" />
                        </div>
                        <div className="flex items-center gap-1">
                            <TrendingUp size={14} className="text-[var(--color-accent-green)]" />
                            <span className="text-xs font-medium text-[var(--color-accent-green)]">{revenueChange}%</span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Ingresos Totales (Mes)</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">${revenue.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <Users size={22} className="text-[var(--color-accent-purple)]" />
                        </div>
                        <div className="flex items-center gap-1">
                            {Number(patientsChange) < 0 ? (
                                <TrendingDown size={14} className="text-[var(--color-accent-red)]" />
                            ) : (
                                <TrendingUp size={14} className="text-[var(--color-accent-green)]" />
                            )}
                            <span className={`text-xs font-medium ${Number(patientsChange) < 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-green)]'}`}>{patientsChange}%</span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Pacientes Nuevos (Mes)</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{newPatients}</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                            <Activity size={22} className="text-[var(--color-accent-green)]" />
                        </div>
                        <div className="flex items-center gap-1">
                            <TrendingDown size={14} className="text-[var(--color-accent-red)]" />
                            <span className="text-xs font-medium text-[var(--color-accent-red)]">-8.4%</span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Continuidad Clínica</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{retentionRate}%</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Pacientes con cita futura programada</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                            <AlertCircle size={22} className="text-[var(--color-accent-red)]" />
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">No-Show Rate</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{noShowRate}%</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Inasistencias este mes</p>
                </div>
            </div>

            {/* Gráficas Principales */}
            <div className="grid grid-cols-12 gap-6 mb-8">
                {/* Ingresos / Barras */}
                <div className="col-span-8 bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Rendimiento Clínico</h3>
                            <p className="text-xs text-[var(--color-text-muted)]">Evolución de ingresos</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByMonth} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF2F7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A0AEC0' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A0AEC0' }} tickFormatter={(v) => `$${v / 1000}k`} />
                            <Tooltip cursor={{ fill: '#F7FAFC' }} formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="revenue" fill="#4A90D9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Canales de Adquisición / Donut */}
                <div className="col-span-4 bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Canales de Adquisición</h3>
                            <p className="text-xs text-[var(--color-text-muted)]">Origen de pacientes nuevos</p>
                        </div>
                        <PieChartIcon size={20} className="text-[var(--color-text-muted)]" />
                    </div>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelsData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {channelsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value}%`, 'Porcentaje']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Leyenda manual para mejor control */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {channelsData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-xs text-[var(--color-text-secondary)]">{entry.name}</span>
                                <span className="text-xs font-bold ml-auto">{entry.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 mb-8">
                {/* Tendencia / Área */}
                <div className="col-span-7 bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-[var(--color-text-primary)]">Tendencia Acumulada</h3>
                            <p className="text-xs text-[var(--color-text-muted)]">Trayectoria de adquisición de pacientes</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={growthTrend}>
                            <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#805AD5" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#805AD5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF2F7" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A0AEC0' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A0AEC0' }} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="patients" stroke="#805AD5" strokeWidth={3} fill="url(#colorGrowth)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pacientes en Riesgo (Ticket Alto > 6 meses sin venir) */}
                <div className="col-span-5 bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                                <AlertCircle size={18} className="text-[var(--color-accent-red)]" />
                                Pacientes en Riesgo
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)]">Ticket alto sin visita en &gt;6 meses</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {patientsAtRisk.length > 0 ? (
                            <div className="space-y-3">
                                {patientsAtRisk.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                                        <div>
                                            <p className="text-sm font-semibold text-red-900">{p.nombre}</p>
                                            <p className="text-xs text-red-700 mt-0.5">{p.telefono}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-red-900">${p.ticket.toLocaleString()}</p>
                                            <p className="text-xs text-red-700 mt-0.5">{Math.floor(p.diasSinVisita / 30)} meses ausente</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                                    <Activity size={24} />
                                </div>
                                <p className="text-sm font-medium text-gray-900">Excelente retención</p>
                                <p className="text-xs text-gray-500 mt-1">No hay pacientes de ticket alto en riesgo de abandono en este momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tratamientos Populares */}
            <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-6">Tratamientos Populares</h3>
                <div className="grid grid-cols-5 gap-4">
                    {popularTreatments.map((treatment, idx) => (
                        <div key={treatment.id} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg flex-shrink-0">
                                {treatmentIcons[idx % treatmentIcons.length]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{treatment.metric_label}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">{treatment.metric_value} procedimientos</p>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${treatmentColors[idx % treatmentColors.length]}`}
                                        style={{ width: `${(treatment.metric_value / maxTreatment) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
