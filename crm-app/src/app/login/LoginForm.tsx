'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
    const search = useSearchParams();
    const next = search.get('next') || '/';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data?.error || 'No se pudo iniciar sesión');
                setLoading(false);
                return;
            }
            // Navegación completa: evita que el router cliente quede con estado
            // stale tras expiración de sesión (causaba spinner infinito).
            window.location.href = next;
        } catch {
            setError('Error de red. Intenta de nuevo.');
            setLoading(false);
        }
    }

    const inputBase =
        'w-full px-4 py-3 rounded-xl border bg-white text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all duration-150 focus:ring-2 focus:ring-[var(--color-accent-blue)]/20';
    const inputBorder = error
        ? 'border-red-300 focus:border-red-400'
        : 'border-[var(--color-border-light)] focus:border-[var(--color-accent-blue)]';

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg-primary)]">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-blue)] flex items-center justify-center shadow-sm mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-[var(--color-text-primary)]">DentalCRM</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Acceso a tu clínica</p>
                </div>

                <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] p-8">
                    <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Iniciar sesión</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mb-6">
                        Introduce tus credenciales para continuar
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                                Usuario
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                autoFocus
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); if (error) setError(null); }}
                                disabled={loading}
                                className={`${inputBase} ${inputBorder}`}
                                placeholder="Tu nombre de usuario"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                                disabled={loading}
                                className={`${inputBase} ${inputBorder}`}
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-accent-blue)] text-white text-sm font-semibold shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Verificando…
                                </>
                            ) : (
                                'Iniciar sesión'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-6">
                    Acceso protegido · DentalCRM © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
