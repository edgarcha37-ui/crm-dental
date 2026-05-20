'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, User } from 'lucide-react';

export interface AutocompletePatient {
  id: number;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
}

interface Props {
  value: AutocompletePatient | null;
  onChange: (patient: AutocompletePatient | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Si se pasa, restringe a pacientes no archivados. Default: true */
  soloActivos?: boolean;
}

/**
 * Input de búsqueda con autocomplete contra /api/patients?q=.
 * Reutilizable por formularios que antes pedían paciente_id numérico.
 */
export default function PatientAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar paciente por nombre...',
  required = false,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompletePatient[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data: AutocompletePatient[] = await res.json();
        setResults(data.slice(0, 8));
      } catch (e) {
        console.error('Autocomplete error:', e);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function selectPatient(p: AutocompletePatient) {
    onChange(p);
    setQuery('');
    setOpen(false);
  }

  function clearSelection() {
    onChange(null);
    setQuery('');
    setResults([]);
  }

  // Cuando ya hay un paciente seleccionado, mostramos un "chip" en lugar del input.
  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-blue-50">
        <User size={16} className="text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{value.nombre}</p>
          {value.telefono && (
            <p className="text-xs text-[var(--color-text-muted)] truncate">{value.telefono}</p>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 rounded hover:bg-blue-100 text-blue-700"
            aria-label="Quitar paciente"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]/20 focus:border-[var(--color-accent-blue)] disabled:bg-gray-50"
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--color-border-light)] shadow-lg max-h-72 overflow-auto">
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
              onClick={() => selectPatient(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-[var(--color-border-light)] last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {p.nombre.charAt(0).toUpperCase()}
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
