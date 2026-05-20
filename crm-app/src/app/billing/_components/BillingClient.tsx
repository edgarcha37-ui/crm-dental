'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, DollarSign, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import PatientAutocomplete, { AutocompletePatient } from '@/components/PatientAutocomplete';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

interface Invoice {
    id: number;
    paciente_id: number;
    paciente_nombre: string;
    tratamiento_nombre: string;
    razon_social: string;
    rfc: string;
    direccion_fiscal: string;
    uso_cfdi: string;
    monto: number;
    fecha: string;
    numero_factura: string;
    estatus: string;
}

interface InvoiceStats {
    monthlyIncome: number;
    pendingPayments: number;
    totalInvoices: number;
}

const tabs = ['Todas', 'Pagadas', 'Pendientes', 'Vencidas'];
const tabFilters = [undefined, 'Pagada', 'Pendiente', 'Vencida'] as const;

interface Props {
    initialInvoices: Invoice[];
    initialStats: InvoiceStats;
}

export default function BillingClient({ initialInvoices, initialStats }: Props) {
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
    const [stats, setStats] = useState<InvoiceStats>(initialStats);
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [firstRender, setFirstRender] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<AutocompletePatient | null>(null);
    const [formData, setFormData] = useState({
        razon_social: '', rfc: '', direccion_fiscal: '',
        uso_cfdi: 'G03', monto: '', numero_factura: '', estatus: 'Pendiente',
        tratamiento_id: '',
    });
    const [exporting, setExporting] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    async function fetchData() {
        try {
            const filter = tabFilters[activeTab];
            const [invoicesRes, statsRes] = await Promise.all([
                fetch(`/api/invoices${filter ? `?filter=${filter}` : ''}`),
                fetch('/api/invoices?stats=true'),
            ]);
            setInvoices(await invoicesRes.json());
            setStats(await statsRes.json());
        } catch (err) {
            console.error('Error al cargar facturas:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (firstRender) { setFirstRender(false); return; }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    async function handleCreate() {
        setFormError(null);
        if (!selectedPatient) { setFormError('Selecciona un paciente'); return; }
        if (!formData.monto || Number(formData.monto) <= 0) { setFormError('Indica el monto'); return; }

        setCreating(true);
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    paciente_id: selectedPatient.id,
                    tratamiento_id: formData.tratamiento_id ? Number(formData.tratamiento_id) : null,
                    monto: Number(formData.monto),
                    fecha: new Date().toISOString().split('T')[0],
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Error ${res.status}`);
            }
            setShowModal(false);
            setSelectedPatient(null);
            setFormData({ razon_social: '', rfc: '', direccion_fiscal: '', uso_cfdi: 'G03', monto: '', numero_factura: '', estatus: 'Pendiente', tratamiento_id: '' });
            fetchData();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Error al crear factura');
        } finally {
            setCreating(false);
        }
    }

    function exportCSV() {
        setExporting(true);
        try {
            const headers = ['Número', 'Paciente', 'Tratamiento', 'Razón Social', 'RFC', 'Fecha', 'Monto', 'Estatus'];
            const rows = invoices.map(i => [
                i.numero_factura || '',
                (i.paciente_nombre || '').replace(/"/g, '""'),
                (i.tratamiento_nombre || '').replace(/"/g, '""'),
                (i.razon_social || '').replace(/"/g, '""'),
                i.rfc || '',
                i.fecha || '',
                i.monto.toFixed(2),
                i.estatus || '',
            ]);
            const csv = [headers, ...rows]
                .map(r => r.map(c => `"${c}"`).join(','))
                .join('\n');
            // BOM para que Excel detecte UTF-8 con tildes.
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const stamp = new Date().toISOString().split('T')[0];
            link.download = `facturas-${stamp}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }

    return (
        <div className="p-8">
            {/* Encabezado */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Facturación y Cobros</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Administra los ingresos y transacciones de la clínica con precisión.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportCSV}
                        disabled={exporting || invoices.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText size={18} />
                        {exporting ? 'Exportando...' : 'Exportar Reporte'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent-blue)] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
                        <Plus size={18} />
                        Crear Nueva Factura
                    </button>
                </div>
            </div>

            {/* Tarjetas Resumen */}
            <div className="grid grid-cols-3 gap-5 mb-8">
                <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[var(--color-text-muted)]">Ingresos del Mes</p>
                        <TrendingUp size={18} className="text-[var(--color-accent-green)]" />
                    </div>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">${stats.monthlyIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[var(--color-text-muted)]">Pagos Pendientes</p>
                        <DollarSign size={18} className="text-[var(--color-accent-yellow)]" />
                    </div>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">${stats.pendingPayments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[var(--color-text-muted)]">Total de Facturas</p>
                        <FileText size={18} className="text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">{stats.totalInvoices}</p>
                </div>
            </div>

            {/* Pestañas */}
            <div className="flex items-center gap-6 mb-6 border-b border-[var(--color-border-light)]">
                {tabs.map((tab, i) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(i)}
                        className={`pb-3 text-sm font-medium transition-all border-b-2 ${activeTab === i
                                ? 'text-[var(--color-accent-blue)] border-[var(--color-accent-blue)]'
                                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--color-border-light)]">
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Paciente</th>
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Tratamiento</th>
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Fecha</th>
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Monto</th>
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Estado</th>
                            <th className="text-left px-6 py-4 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-muted)]">Cargando...</td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-muted)]">No se encontraron facturas</td></tr>
                        ) : invoices.map((invoice) => (
                            <tr key={invoice.id} className="border-b border-[var(--color-border-light)] last:border-0 hover:bg-gray-50/50 transition-all">
                                <td className="px-6 py-4 text-sm font-semibold text-[var(--color-text-primary)]">
                                    {invoice.paciente_id ? (
                                        <Link href={`/patients/${invoice.paciente_id}`} className="hover:text-[var(--color-accent-blue)] transition-colors hover:underline">
                                            {invoice.paciente_nombre || invoice.razon_social}
                                        </Link>
                                    ) : (
                                        invoice.paciente_nombre || invoice.razon_social
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">{invoice.tratamiento_nombre || '—'}</td>
                                <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                                    {new Date(invoice.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-[var(--color-text-primary)]">
                                    ${invoice.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${invoice.estatus === 'Pagada' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                                        }`}>
                                        {invoice.estatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={async () => {
                                            const settings = await fetch('/api/settings').then(r => r.ok ? r.json() : null).catch(() => null);
                                            const clinica = settings?.clinica || {};
                                            generateInvoicePDF(
                                                {
                                                    numero: invoice.numero_factura || `INV-${invoice.id}`,
                                                    fecha: invoice.fecha,
                                                    paciente_nombre: invoice.paciente_nombre,
                                                    razon_social: invoice.razon_social,
                                                    rfc: invoice.rfc,
                                                    direccion_fiscal: invoice.direccion_fiscal,
                                                    tratamiento_nombre: invoice.tratamiento_nombre,
                                                    monto: invoice.monto,
                                                    estatus: invoice.estatus,
                                                },
                                                {
                                                    nombre: clinica.nombre || 'DentalCRM',
                                                    direccion: clinica.direccion,
                                                    telefono: clinica.telefono,
                                                    correo: clinica.correo,
                                                }
                                            );
                                        }}
                                        className="text-xs text-[var(--color-accent-blue)] font-medium hover:underline"
                                    >
                                        Descargar PDF
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Paginación */}
                <div className="px-6 py-4 border-t border-[var(--color-border-light)] flex items-center justify-between">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Mostrando {invoices.length} de {stats.totalInvoices} transacciones
                    </p>
                    <div className="flex items-center gap-1">
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-gray-100">
                            <ChevronLeft size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-gray-100">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Crear Factura */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-8 w-[560px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Crear Nueva Factura</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Paciente</label>
                                <PatientAutocomplete value={selectedPatient} onChange={setSelectedPatient} required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Número de Factura</label>
                                <input type="text" value={formData.numero_factura}
                                    onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    placeholder="FAC-006"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Razón Social</label>
                                <input type="text" value={formData.razon_social}
                                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    placeholder="Nombre o razón social"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">RFC</label>
                                    <input type="text" value={formData.rfc}
                                        onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                        placeholder="XXXX000000XX0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Uso de CFDI</label>
                                    <select value={formData.uso_cfdi}
                                        onChange={(e) => setFormData({ ...formData, uso_cfdi: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    >
                                        <option value="G03">G03 - Gastos en general</option>
                                        <option value="D01">D01 - Honorarios médicos</option>
                                        <option value="P01">P01 - Por definir</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Dirección Fiscal</label>
                                <input type="text" value={formData.direccion_fiscal}
                                    onChange={(e) => setFormData({ ...formData, direccion_fiscal: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    placeholder="Dirección fiscal completa"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Monto ($)</label>
                                    <input type="number" value={formData.monto}
                                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Estado</label>
                                    <select value={formData.estatus}
                                        onChange={(e) => setFormData({ ...formData, estatus: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Pagada">Pagada</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {formError && (
                            <div className="mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">{formError}</div>
                        )}
                        <div className="flex items-center gap-3 mt-8">
                            <button onClick={() => { setShowModal(false); setFormError(null); }} disabled={creating} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all disabled:opacity-60">
                                Cancelar
                            </button>
                            <button onClick={handleCreate} disabled={creating} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 transition-all shadow-md disabled:opacity-60">
                                {creating ? 'Creando...' : 'Crear Factura'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
