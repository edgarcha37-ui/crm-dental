'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Clock, AlertTriangle, CheckCircle, Circle, Archive, Package, Wrench, FlaskConical, Calendar as CalendarIcon, type LucideIcon } from 'lucide-react';
import LabWorksPanel from '@/components/LabWorksPanel';
import { NotaOperativaCategoria, NotePrioridad } from '@/types';

interface NotaOperativa {
    id: number;
    titulo: string;
    categoria: 'Suministros' | 'Mantenimiento' | 'Laboratorio';
    prioridad: 'Alta' | 'Media' | 'Baja';
    completada: boolean;
    fecha_creacion: string;
    fecha_vencimiento: string | null;
}

const CAT_ICONS: Record<string, LucideIcon> = {
    'Suministros': Package,
    'Mantenimiento': Wrench,
    'Laboratorio': FlaskConical
};

const CAT_COLORS: Record<string, string> = {
    'Suministros': 'bg-blue-100 text-blue-700',
    'Mantenimiento': 'bg-orange-100 text-orange-700',
    'Laboratorio': 'bg-purple-100 text-purple-700'
};

const PRIORITY_STYLES: Record<string, { badge: string; card: string; icon: LucideIcon }> = {
    'Alta': { badge: 'bg-red-100 text-red-700', card: 'border-l-4 border-l-red-500 bg-red-50/30', icon: AlertTriangle },
    'Media': { badge: 'bg-yellow-100 text-yellow-700', card: 'border border-[var(--color-border-light)]', icon: Clock },
    'Baja': { badge: 'bg-gray-100 text-gray-700', card: 'border border-[var(--color-border-light)]', icon: Circle }
};

export default function NotesPage() {
    const [notas, setNotas] = useState<NotaOperativa[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<{
        titulo: string;
        categoria: NotaOperativaCategoria;
        prioridad: NotePrioridad;
        fecha_vencimiento: string;
    }>({
        titulo: '', categoria: 'Suministros', prioridad: 'Media', fecha_vencimiento: ''
    });

    async function fetchNotas() {
        try {
            const res = await fetch('/api/notas-operativas');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotas(data);
            } else {
                console.error('La API no devolvió un array:', data);
                setNotas([]);
            }
        } catch (err) {
            console.error('Error al cargar notas:', err);
            setNotas([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchNotas(); }, []);

    async function handleCreate() {
        if (!formData.titulo.trim()) return;
        await fetch('/api/notas-operativas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, completada: false }),
        });
        setShowModal(false);
        setFormData({ titulo: '', categoria: 'Suministros', prioridad: 'Media', fecha_vencimiento: '' });
        fetchNotas();
    }

    async function toggleComplete(id: number, completada: boolean) {
        await fetch('/api/notas-operativas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, completada: !completada }),
        });
        fetchNotas();
    }

    async function handleDelete(id: number) {
        await fetch(`/api/notas-operativas?id=${id}`, { method: 'DELETE' });
        fetchNotas();
    }

    const activas = notas.filter(n => !n.completada);
    const resumen = {
        alta: activas.filter(n => n.prioridad === 'Alta').length,
        media: activas.filter(n => n.prioridad === 'Media').length,
        baja: activas.filter(n => n.prioridad === 'Baja').length,
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Gestión Operativa</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Control de tareas administrativas, insumos y mantenimiento de la clínica.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Buscar tarea..."
                            className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] transition-all"
                        />
                    </div>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
                        <Plus size={18} />
                        Nueva Tarea
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-8">
                {/* Resumen Lateral */}
                <div className="col-span-1 space-y-6">
                    <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                        <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4 uppercase tracking-wider">Resumen de Pendientes</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertTriangle size={18} />
                                    <span className="font-semibold text-sm">Críticas (Alta)</span>
                                </div>
                                <span className="text-lg font-bold text-red-700">{resumen.alta}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                                <div className="flex items-center gap-2 text-yellow-700">
                                    <Clock size={18} />
                                    <span className="font-semibold text-sm">Regulares (Media)</span>
                                </div>
                                <span className="text-lg font-bold text-yellow-700">{resumen.media}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Archive size={18} />
                                    <span className="font-semibold text-sm">Atrasadas (Baja)</span>
                                </div>
                                <span className="text-lg font-bold text-gray-700">{resumen.baja}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[var(--color-accent-blue)] to-blue-600 rounded-[var(--radius-card)] p-6 text-white shadow-md">
                        <h3 className="font-bold text-base mb-2">Automatización Activa</h3>
                        <p className="text-xs text-blue-100 mb-4 leading-relaxed">
                            El asistente virtual (n8n) está monitoreando las tareas de <strong>Prioridad Alta</strong>. Si no se completan en 24h, recibirás una alerta por WhatsApp.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-medium bg-white/20 w-fit px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            Monitoreo en línea
                        </div>
                    </div>
                </div>

                {/* Lista Principal */}
                <div className="col-span-3">
                    <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--color-border-light)] bg-gray-50/50 flex items-center justify-between">
                            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Tareas To-Do</h2>
                            <span className="text-xs font-medium text-[var(--color-text-muted)] bg-white px-3 py-1 rounded-full border border-gray-200">
                                {activas.length} tareas pendientes
                            </span>
                        </div>
                        
                        {loading ? (
                            <div className="p-12 text-center text-[var(--color-text-muted)]">Cargando tareas...</div>
                        ) : notas.length === 0 ? (
                            <div className="p-12 text-center text-[var(--color-text-muted)]">
                                <Archive size={32} className="mx-auto mb-3 opacity-30" />
                                <p>No hay tareas operativas en este momento.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--color-border-light)]">
                                {notas.map(nota => {
                                    const PStyle = PRIORITY_STYLES[nota.prioridad];
                                    const CatIcon = CAT_ICONS[nota.categoria] || Archive;
                                    const catColor = CAT_COLORS[nota.categoria] || 'bg-gray-100 text-gray-600';
                                    
                                    return (
                                        <div key={nota.id} className={`p-5 flex gap-4 transition-all hover:bg-gray-50 group ${nota.completada ? 'opacity-50' : PStyle.card}`}>
                                            <button onClick={() => toggleComplete(nota.id, nota.completada)} className="mt-0.5 flex-shrink-0">
                                                {nota.completada ? (
                                                    <CheckCircle size={22} className="text-green-500" />
                                                ) : (
                                                    <Circle size={22} className="text-gray-300 hover:text-blue-500 transition-colors" />
                                                )}
                                            </button>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className={`text-sm font-semibold ${nota.completada ? 'line-through text-gray-500' : 'text-[var(--color-text-primary)]'}`}>
                                                        {nota.titulo}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        {nota.prioridad === 'Alta' && !nota.completada && (
                                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded animate-pulse">
                                                                <AlertTriangle size={10} /> Urgente
                                                            </span>
                                                        )}
                                                        <button onClick={() => handleDelete(nota.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${catColor}`}>
                                                        <CatIcon size={12} /> {nota.categoria}
                                                    </span>
                                                    
                                                    {nota.fecha_vencimiento && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                                            <CalendarIcon size={12} /> 
                                                            Vence: {new Date(nota.fecha_vencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                    
                                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PStyle.badge}`}>
                                                        {nota.prioridad}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Crear */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Nueva Tarea Operativa</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Descripción de la tarea</label>
                                <input
                                    type="text" value={formData.titulo}
                                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
                                    placeholder="Ej: Pedir anestesia lidocaína"
                                    autoFocus
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Categoría</label>
                                    <select
                                        value={formData.categoria}
                                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value as NotaOperativaCategoria })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    >
                                        <option value="Suministros">📦 Suministros</option>
                                        <option value="Laboratorio">🧪 Laboratorio</option>
                                        <option value="Mantenimiento">🔧 Mantenimiento</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Prioridad</label>
                                    <select
                                        value={formData.prioridad}
                                        onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as NotePrioridad })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    >
                                        <option value="Alta">🔴 Alta (Crítica)</option>
                                        <option value="Media">🟡 Media</option>
                                        <option value="Baja">⚪ Baja</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Fecha de Vencimiento (Opcional)</label>
                                <input
                                    type="date" value={formData.fecha_vencimiento}
                                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] text-gray-600"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-8">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleCreate} disabled={!formData.titulo.trim()} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                                Guardar Tarea
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LabWorksPanel />
        </div>
    );
}
