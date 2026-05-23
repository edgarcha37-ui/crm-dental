import { getSupabaseAdmin } from './supabase';
import { logger } from './logger';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  actor: string;
  action: AuditAction;
  entity: string;
  entity_id?: string | number | null;
  diff?: { before?: unknown; after?: unknown } | unknown;
  route?: string;
  ip?: string;
}

/**
 * Registra una mutación en audit_log. Nunca lanza para no romper el endpoint
 * que la invoca — los fallos de auditoría se loggean pero se tragan.
 *
 * Si la tabla audit_log no existe (migración pendiente), el insert falla
 * silenciosamente — al aplicar la migración 008 empieza a llenarse.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from('audit_log').insert({
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id != null ? String(entry.entity_id) : null,
      diff: entry.diff ?? null,
      route: entry.route ?? null,
      ip: entry.ip ?? null,
    });
    if (error && error.code !== '42P01') {
      // 42P01 = tabla no existe; el resto sí queremos ver en logs.
      logger.warn({ err: error.message, entry }, 'audit insert failed');
    }
  } catch (e) {
    logger.warn({ err: e instanceof Error ? e.message : String(e), entry }, 'audit threw');
  }
}

export function getActorFromRequest(request: Request): string {
  // MVP single-user: si la request trae x-internal-key es n8n, si no es el usuario logueado (Edgar).
  const internal = request.headers.get('x-internal-key');
  if (internal && internal === process.env.INTERNAL_API_KEY) return 'n8n';
  return process.env.CRM_USER || 'Edgar';
}

export function getIpFromRequest(request: Request): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || undefined;
}
