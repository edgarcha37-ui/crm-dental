'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Bell, Filter, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useToast } from '@/components/Toast';
import PatientsImport from './PatientsImport';

export interface PatientRow {
    id: number;
    nombre: string;
    telefono: string | null;
    fuente_captacion: string | null;
    fecha_registro: string;
    archivado: boolean;
    ultimo_tratamiento?: string;
    estatus_tratamiento?: string;
    saldo_pendiente?: number;
}

type TabKey = 'todos' | 'archivados';
const TABS: { key: TabKey; label: string }[] = [
    { key: 'todos', label: 'Pacientes' },
    { key: 'archivados', label: 'Archivados' },
];

const avatarColors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-yellow-100 text-yellow-600', 'bg-pink-100 text-pink-600', 'bg-indigo-100 text-indigo-600'];

function getInitials(nombre: string) {
    return nombre.split(' ').map(n => n[0] ?? '').join('').substring(0, 2).toUpperCase();
}

interface Props {
    initialPatients: PatientRow[];
}

/**
 * Cliente: maneja búsqueda, tabs, filtros y modal de crear/editar.
 * El primer render usa initialPatients (server-rendered) — no hay flash de
 * "Cargando...". Las búsquedas subsiguientes pegan a /api/patients.
 */
export default function PatientsClient({ initialPatients }: Props) {
    const toast = useToast();
    const [patients, setPatients] = useState<PatientRow[]>(initialPatients);
    const [activeTab, setActiveTab] = useState<TabKey>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingPatient, setEditingPatient] = useState<PatientRow | null>(null);
    const [formData, setFormData] = useState({ nombre: '', telefono: '', correo: '', direccion: '', fuente_captacion: 'Otro' });
    const [saving, setSaving] = useState(false);
    const [quickFilter, setQuickFilter] = useState('Todos');
    // Skip primer fetch para no duplicar lo que ya nos pasó el server.
    const [firstRender, setFirstRender] = useState(true);

    const displayedPatients = patients.filter(p => {
        if (quickFilter === 'Todos') return true;
        if (quickFilter === 'Con Adeudo') return (p.saldo_pendiente || 0) > 0;
        if (quickFilter === 'Tratamientos Activos') return p.estatus_tratamiento && p.estatus_tratamiento !== 'Completado' && p.estatus_tratamiento !== 'Cancelado';
        if (quickFilter === 'Sin Cita Próxima') return true; // TODO: requiere info de citas
        return true;
    });

    async function fetchData() {
        setLoading(true);
        try {
            const url = searchQuery
                ? `/api/patients?q=${encodeURIComponent(searchQuery)}`
                : activeTab === 'archivados' ? '/api/patients?filter=archivados' : '/api/patients?filter=activos';
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data: PatientRow[] = await res.json();
            setPatients(data);
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
            toast.error('No se pudieron cargar los pacientes');
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (firstRender) { setFirstRender(false); return; }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, activeTab]);

    async function handleSave() {
        setSaving(true);
        try {
            const res = editingPatient
                ? await fetch(`/api/patients/${editingPatient.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
                : await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Error ${res.status}`);
            }
            toast.success(editingPatient ? 'Paciente actualizado' : 'Paciente agregado');
            setShowModal(false);
            setEditingPatient(null);
            setFormData({ nombre: '', telefono: '', correo: '', direccion: '', fuente_captacion: 'Otro' });
            await fetchData();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Error al guardar paciente');
        } finally {
            setSaving(false);
        }
    }

    function openCreate() {
        setEditingPatient(null);
        setFormData({ nombre: '', telefono: '', correo: '', direccion: '', fuente_captacion: 'Otro' });
        setShowModal(true);
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Directorio de Pacientes</h1>
                    <span className="px-3 py-1 bg-blue-50 text-[var(--color-accent-blue)] text-xs font-semibold rounded-full">
                        {patients.length} {activeTab === 'archivados' ? 'Archivados' : 'Total'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Buscar pacientes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] transition-all"
                        />
                    </div>
                    <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm">
                        <Upload size={16} />
                        Importar CSV
                    </button>
                    <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
                        <Plus size={18} />
                        Agregar Paciente
                    </button>
                    <button className="p-2.5 rounded-xl bg-white border border-[var(--color-border)] hover:bg-gray-50 transition-all relative">
                        <Bell size={20} className="text-[var(--color-text-secondary)]" />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-1">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === key
                                ? 'bg-[var(--color-accent-blue)] text-white shadow-md'
                                : 'text-[var(--color-text-secondary)] hover:bg-gray-100'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[var(--color-border-light)] shadow-sm">
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">Vistas:</span>
                        {['Todos', 'Con Adeudo', 'Sin Cita Próxima', 'Tratamientos Activos'].map(f => (
                            <button
                                key={f}
                                onClick={() => setQuickFilter(f)}
                                className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${quickFilter === f ? 'bg-[var(--color-accent-blue)] text-white shadow-sm' : 'text-[var(--color-text-secondary)] hover:bg-gray-100'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-white rounded-xl transition-all border border-transparent hover:border-[var(--color-border-light)]">
                        <Filter size={16} />
                        Filtros Avanzados
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--color-border-light)]">
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Paciente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-6 py-12 text-center text-[var(--color-text-muted)]">Cargando...</td></tr>
                        ) : displayedPatients.length === 0 ? (
                            <tr><td className="px-6 py-12 text-center text-[var(--color-text-muted)]">
                                {activeTab === 'archivados' ? 'No hay pacientes archivados' : 'No se encontraron pacientes'}
                            </td></tr>
                        ) : displayedPatients.map((patient, idx) => (
                            <tr key={patient.id} className={`border-b border-[var(--color-border-light)] last:border-0 transition-all ${patient.archivado ? 'opacity-60' : 'hover:bg-gray-50/50'}`}>
                                <td className="px-6 py-4">
                                    <Link href={`/patients/${patient.id}`} className="flex items-center gap-3 hover:opacity-80 transition-all">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColors[idx % avatarColors.length]}`}>
                                            {getInitials(patient.nombre)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-blue)] transition-all">{patient.nombre}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">#P-{String(9000 + patient.id).padStart(4, '0')} · {new Date(patient.fecha_registro).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="px-6 py-4 border-t border-[var(--color-border-light)] flex items-center justify-between">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Mostrando {displayedPatients.length} registros
                    </p>
                    <div className="flex items-center gap-1">
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-gray-100 transition-all">
                            <ChevronLeft size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-[var(--color-accent-blue)] text-white text-xs font-medium flex items-center justify-center">1</button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-gray-100 transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
                            {editingPatient ? 'Editar Paciente' : 'Agregar Nuevo Paciente'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Nombre Completo</label>
                                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
                                    placeholder="Nombre del paciente" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Teléfono</label>
                                <input type="text" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
                                    placeholder="+52 55 1234 5678" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Correo Electrónico</label>
                                <input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
                                    placeholder="paciente@email.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Dirección</label>
                                <input type="text" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)]"
                                    placeholder="Calle, colonia, ciudad" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Fuente de Captación</label>
                                <select value={formData.fuente_captacion} onChange={(e) => setFormData({ ...formData, fuente_captacion: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] bg-white">
                                    {['Instagram', 'Facebook', 'Referido', 'Google', 'Otro'].map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-8">
                            <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all disabled:opacity-60">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 transition-all shadow-md disabled:opacity-60">
                                {saving ? 'Guardando...' : editingPatient ? 'Guardar Cambios' : 'Agregar Paciente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PatientsImport
                open={showImport}
                onClose={() => setShowImport(false)}
                onImported={() => fetchData()}
            />
        </div>
    );
}
