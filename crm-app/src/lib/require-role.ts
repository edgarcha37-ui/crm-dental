import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './session';
import type { Role } from './permissions';

/**
 * Helper para endpoints sensibles. Lee la cookie, valida la sesión y
 * verifica que el rol del usuario esté en `allowedRoles`.
 *
 * Si pasa: devuelve null y el endpoint sigue.
 * Si no pasa: devuelve un NextResponse con 401/403 que el endpoint debe retornar.
 *
 * El middleware ya valida sesión, pero no rol — el rol se chequea acá donde
 * conocemos el contexto de cada endpoint.
 */
export async function requireRole(request: Request, allowedRoles: Role[]): Promise<NextResponse | null> {
  // Bypass para llamadas internas (n8n) que ya pasaron el middleware con x-internal-key
  const internal = request.headers.get('x-internal-key');
  if (internal && internal === process.env.INTERNAL_API_KEY) return null;

  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const token = match?.[1];
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  // Sesiones viejas sin role: tratan como admin (compat con tokens pre-migración)
  const role: Role = session.r || 'admin';
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Permiso insuficiente' }, { status: 403 });
  }
  return null;
}
