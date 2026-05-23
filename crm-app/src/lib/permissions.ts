/**
 * Sistema de permisos por rol — MVP.
 *
 * Matriz inicial (revisable):
 *
 *   admin     → todo. Default para el dueño del consultorio.
 *   doctor    → escribe sólo clínica: notas, odontograma, tratamientos,
 *               historia clínica, planes de tratamiento. Lee todo.
 *   recepcion → escribe agenda/cobros: pacientes, citas, facturas, abonos.
 *               NO puede borrar pacientes, ni ver audit, ni tocar settings.
 *
 * Para mantenerlo simple, expresamos permisos como (entity, action) → roles.
 * `action` es el verbo HTTP: GET, POST, PUT, DELETE. GET es público para
 * todos los roles internos (el middleware ya valida sesión).
 *
 * Si necesitamos granularidad fina (ej. doctor puede borrar SUS notas pero
 * no las de otro), eso es para una siguiente iteración con ownership.
 */

export type Role = 'admin' | 'doctor' | 'recepcion';

export const ALL_ROLES: Role[] = ['admin', 'doctor', 'recepcion'];

// Mapa (entity → action → roles permitidos)
// Por defecto admin tiene todo. Si una entidad no aparece, sólo admin escribe.
const PERMISSIONS: Record<string, Partial<Record<'POST' | 'PUT' | 'DELETE', Role[]>>> = {
  patients:           { POST: ['admin', 'recepcion'], PUT: ['admin', 'recepcion', 'doctor'], DELETE: ['admin'] },
  appointments:       { POST: ['admin', 'recepcion'], PUT: ['admin', 'recepcion'], DELETE: ['admin', 'recepcion'] },
  invoices:           { POST: ['admin', 'recepcion'], PUT: ['admin', 'recepcion'], DELETE: ['admin'] },
  abonos:             { POST: ['admin', 'recepcion'] },
  doctors:            { POST: ['admin'], PUT: ['admin'], DELETE: ['admin'] },
  settings:           { PUT: ['admin'] },
  // Clínicos: doctor + admin
  notes:              { POST: ['admin', 'doctor'], PUT: ['admin', 'doctor'], DELETE: ['admin', 'doctor'] },
  treatments:         { POST: ['admin', 'doctor'], PUT: ['admin', 'doctor'], DELETE: ['admin', 'doctor'] },
  'treatment-plans':  { POST: ['admin', 'doctor'], PUT: ['admin', 'doctor'], DELETE: ['admin', 'doctor'] },
  odontograma:        { PUT: ['admin', 'doctor'] },
  'medical-history':  { PUT: ['admin', 'doctor'] },
  'lab-works':        { POST: ['admin', 'doctor'], PUT: ['admin', 'doctor'], DELETE: ['admin'] },
};

export function canMutate(role: Role | undefined, entity: string, action: 'POST' | 'PUT' | 'DELETE'): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  const allowed = PERMISSIONS[entity]?.[action];
  return !!allowed?.includes(role);
}

export function isValidRole(r: unknown): r is Role {
  return typeof r === 'string' && (ALL_ROLES as string[]).includes(r);
}
