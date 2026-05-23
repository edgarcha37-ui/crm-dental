import { describe, it, expect } from 'vitest';
import { canMutate } from '@/lib/permissions';

describe('canMutate', () => {
  it('admin puede todo', () => {
    expect(canMutate('admin', 'patients', 'DELETE')).toBe(true);
    expect(canMutate('admin', 'doctors', 'PUT')).toBe(true);
    expect(canMutate('admin', 'settings', 'PUT')).toBe(true);
    expect(canMutate('admin', 'entidad-inventada', 'POST')).toBe(true);
  });

  it('recepcion crea pacientes pero no doctores', () => {
    expect(canMutate('recepcion', 'patients', 'POST')).toBe(true);
    expect(canMutate('recepcion', 'doctors', 'POST')).toBe(false);
    expect(canMutate('recepcion', 'doctors', 'PUT')).toBe(false);
  });

  it('recepcion no borra pacientes', () => {
    expect(canMutate('recepcion', 'patients', 'DELETE')).toBe(false);
  });

  it('doctor toca clínica pero no facturas', () => {
    expect(canMutate('doctor', 'notes', 'POST')).toBe(true);
    expect(canMutate('doctor', 'odontograma', 'PUT')).toBe(true);
    expect(canMutate('doctor', 'invoices', 'POST')).toBe(false);
  });

  it('role undefined nunca puede mutar', () => {
    expect(canMutate(undefined, 'patients', 'POST')).toBe(false);
  });
});
