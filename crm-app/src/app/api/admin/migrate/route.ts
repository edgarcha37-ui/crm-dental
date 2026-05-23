import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { logApiError } from '@/lib/logger';

// Endpoint temporal para aplicar migraciones que el dueño del repo
// no puede correr directo contra Postgres (puerto cerrado externamente).
// Requiere x-internal-key === INTERNAL_API_KEY (validado por middleware).
// Borrar este endpoint después de aplicar.

const MIGRATIONS: Record<string, string> = {
  '008': `
    CREATE TABLE IF NOT EXISTS audit_log (
      id          BIGSERIAL PRIMARY KEY,
      ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor       TEXT NOT NULL,
      action      VARCHAR(10) NOT NULL
                  CHECK (action IN ('INSERT','UPDATE','DELETE')),
      entity      VARCHAR(40) NOT NULL,
      entity_id   TEXT,
      diff        JSONB,
      route       TEXT,
      ip          TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_ts     ON audit_log(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor  ON audit_log(actor);
  `,
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !MIGRATIONS[id]) {
    return NextResponse.json({ error: 'Migración no encontrada' }, { status: 404 });
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: 'DATABASE_URL no configurada' }, { status: 500 });
  }
  const client = new Client({ connectionString, ssl: false });
  try {
    await client.connect();
    await client.query(MIGRATIONS[id]);
    await client.end();
    return NextResponse.json({ ok: true, migration: id });
  } catch (e) {
    try { await client.end(); } catch {}
    logApiError('POST /api/admin/migrate', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error aplicando migración' }, { status: 500 });
  }
}
