'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User } from 'lucide-react';

interface PatientHit {
  id: number;
  nombre: string;
  telefono?: string | null;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data: PatientHit[] = await res.json();
        setResults(data.slice(0, 6));
      } catch (e) {
        console.error('Global search:', e);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function go(p: PatientHit) {
    setOpen(false);
    setQuery('');
    router.push(`/patients/${p.id}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar paciente, expediente..."
          className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[var(--color-border)] text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] transition-all"
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 right-0 mt-1 bg-white rounded-xl border border-[var(--color-border-light)] shadow-lg max-h-80 overflow-auto w-80">
          {loading && (
            <div className="px-4 py-3 text-xs text-[var(--color-text-muted)]">Buscando...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-[var(--color-text-muted)]">Sin coincidencias</div>
          )}
          {!loading && results.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => go(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-[var(--color-border-light)] last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{p.nombre}</p>
                {p.telefono && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{p.telefono}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
