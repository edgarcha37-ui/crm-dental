'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface AuditEntry {
    id: number;
    ts: string;
    actor: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    entity: string;
    entity_id: string | null;
    diff: Record<string, unknown> | null;
    route: string | null;
    ip: string | null;
}

const ENTITIES = ['', 'patients', 'appointments', 'treatments', 'invoices', 'doctors', 'lab_works', 'notes', 'notas_operativas', 'treatment_plans', 'abonos'];
const ACTIONS = ['', 'INSERT', 'UPDATE', 'DELETE'];
const PAGE_SIZE = 20;

const ACTION_COLORS: Record<string, string> = {
    INSERT: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
};

const ENTITY_LABELS: Record<string, string> = {
    patients: 'Pacientes',
    appointments: 'Citas',
    treatments: 'Tratamientos',
    invoices: 'Facturas',
    doctors: 'Doctores',
    lab_works: 'Lab Works',
    notes: 'Notas',
    notas_operativas: 'Notas Op.',
    treatment_plans: 'Planes Tx',
    abonos: 'Abonos',
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function DiffViewer({ diff }: { diff: Record<string, unknown> | null }) {
    if (!diff) return <span className="text-[var(--color-text-muted)]">—</span>;

    const before = diff.before as Record<string, unknown> | undefined;
    const after = diff.after as Record<string, unknown> | undefined;

    if (!before && !after) {
        return <pre className="text-[10px] whitespace-pre-wrap break-all max-h-40 overflow-auto">{JSON.stringify(diff, null, 2)}</pre>;
    }

    const allKeys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {}),
    ]);
    const changedKeys = [...allKeys].filter(k => {
        const b = before?.[k];
        const a = after?.[k];
        return JSON.stringify(b) !== JSON.stringify(a);
    });

    if (changedKeys.length === 0 && after) {
        return (
            <div className="space-y-1">
                {Object.entries(after).slice(0, 8).map(([k, v]) => (
                    <div key={k} className="text-[10px]">
                        <span className="font-medium text-green-700">{k}:</span>{' '}
                        <span className="text-[var(--color-text-primary)]">{String(v ?? '—')}</span>
                    </div>
                ))}
                {Object.keys(after).length > 8 && <p className="text-[10px] text-[var(--color-text-muted)]">+{Object.keys(after).length - 8} más</p>}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {changedKeys.slice(0, 6).map(k => (
                <div key={k} className="text-[10px]">
                    <span className="font-medium text-[var(--color-text-primary)]">{k}:</span>{' '}
                    {before?.[k] !== undefined && (
                        <span className="text-red-500 line-through mr-1">{String(before[k] ?? 'null')}</span>
                    )}
                    {after?.[k] !== undefined && (
                        <span className="text-green-600">{String(after[k] ?? 'null')}</span>
                    )}
                </div>
            ))}
            {changedKeys.length > 6 && <p className="text-[10px] text-[var(--color-text-muted)]">+{changedKeys.length - 6} campos más</p>}
        </div>
    );
}

export default function AuditLogViewer() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterEntity, setFilterEntity] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchLog = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', String(PAGE_SIZE));
            params.set('offset', String(page * PAGE_SIZE));
            if (filterEntity) params.set('entity', filterEntity);
            if (filterAction) params.set('action', filterAction);

            const res = await fetch(`/api/audit-log?${params}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setEntries(data.data);
            setTotal(data.total);
        } catch {
            setEntries([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, filterEntity, filterAction]);

    useEffect(() => { fetchLog(); }, [fetchLog]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Registro de Auditoría</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Historial completo de cambios en el sistema</p>
                </div>
                <button
                    onClick={() => fetchLog()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-gray-50 transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 mb-5">
                <select
                    value={filterEntity}
                    onChange={e => { setFilterEntity(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                >
                    <option value="">Todas las entidades</option>
                    {ENTITIES.filter(Boolean).map(e => (
                        <option key={e} value={e}>{ENTITY_LABELS[e] || e}</option>
                    ))}
                </select>
                <select
                    value={filterAction}
                    onChange={e => { setFilterAction(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20"
                >
                    <option value="">Todas las acciones</option>
                    {ACTIONS.filter(Boolean).map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">{total} registros</span>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
                    No hay registros de auditoría{filterEntity || filterAction ? ' con estos filtros' : ''}.
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--color-border-light)]">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 text-[var(--color-text-muted)] uppercase tracking-wider">
                                <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                                <th className="text-left px-4 py-3 font-semibold">Actor</th>
                                <th className="text-left px-4 py-3 font-semibold">Acción</th>
                                <th className="text-left px-4 py-3 font-semibold">Entidad</th>
                                <th className="text-left px-4 py-3 font-semibold">ID</th>
                                <th className="text-left px-4 py-3 font-semibold">Ruta</th>
                                <th className="text-center px-4 py-3 font-semibold w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-light)]">
                            {entries.map(entry => (
                                <>
                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-all">
                                        <td className="px-4 py-3 text-[var(--color-text-primary)] whitespace-nowrap">{formatDate(entry.ts)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${entry.actor === 'n8n' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {entry.actor}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700'}`}>
                                                {entry.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--color-text-primary)]">{ENTITY_LABELS[entry.entity] || entry.entity}</td>
                                        <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono">{entry.entity_id || '—'}</td>
                                        <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono truncate max-w-[200px]">{entry.route || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {entry.diff && (
                                                <button
                                                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                                    className={`p-1 rounded-lg transition-all ${expandedId === entry.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-[var(--color-text-muted)]'}`}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedId === entry.id && entry.diff && (
                                        <tr key={`${entry.id}-diff`}>
                                            <td colSpan={7} className="px-4 py-3 bg-slate-50 border-t border-dashed border-[var(--color-border-light)]">
                                                <DiffViewer diff={entry.diff as Record<string, unknown>} />
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Página {page + 1} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-40 transition-all"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-40 transition-all"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
