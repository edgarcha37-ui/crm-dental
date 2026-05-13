'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, TrendingUp, DollarSign, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function BillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [stats, setStats] = useState<InvoiceStats>({ monthlyIncome: 0, pendingPayments: 0, totalInvoices: 0 });
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        paciente_id: '', razon_social: '', rfc: '', direccion_fiscal: '',
        uso_cfdi: 'G03', monto: '', numero_factura: '', estatus: 'Pendiente',
        tratamiento_id: '',
    });

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

    useEffect(() => { fetchData(); }, [activeTab]);

    async function handleCreate() {
        await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                paciente_id: Number(formData.paciente_id),
                tratamiento_id: formData.tratamiento_id ? Number(formData.tratamiento_id) : null,
                monto: Number(formData.monto),
                fecha: new Date().toISOString().split('T')[0],
            }),
        });
        setShowModal(false);
        setFormData({ paciente_id: '', razon_social: '', rfc: '', direccion_fiscal: '', uso_cfdi: 'G03', monto: '', numero_factura: '', estatus: 'Pendiente', tratamiento_id: '' });
        fetchData();
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
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm">
                        <FileText size={18} />
                        Exportar Reporte
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
                    <p className="text-xs text-[var(--color-accent-green)] mt-1">↑ 12.5% vs mes anterior</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[var(--color-text-muted)]">Pagos Pendientes</p>
                        <DollarSign size={18} className="text-[var(--color-accent-yellow)]" />
                    </div>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">${stats.pendingPayments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-[var(--color-accent-yellow)] mt-1">→ -2.4% disminución</p>
                </div>

                <div className="bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-[var(--color-text-muted)]">Total de Facturas</p>
                        <FileText size={18} className="text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">{stats.totalInvoices}</p>
                    <p className="text-xs text-[var(--color-accent-green)] mt-1">+ 5.0% pacientes nuevos</p>
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
                                    <button className="text-xs text-[var(--color-accent-blue)] font-medium hover:underline">Ver Factura</button>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">ID del Paciente</label>
                                    <input type="number" value={formData.paciente_id}
                                        onChange={(e) => setFormData({ ...formData, paciente_id: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                        placeholder="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Número de Factura</label>
                                    <input type="text" value={formData.numero_factura}
                                        onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                                        placeholder="FAC-006"
                                    />
                                </div>
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
                        <div className="flex items-center gap-3 mt-8">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleCreate} className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-medium hover:bg-blue-600 transition-all shadow-md">
                                Crear Factura
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
