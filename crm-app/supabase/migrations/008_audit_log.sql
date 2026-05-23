-- 008_audit_log.sql
-- Registro de auditoría de mutaciones (POST/PUT/PATCH/DELETE) sobre entidades del CRM.
-- Permite responder "quién cambió qué y cuándo" en caso de incidente o duda clínica.

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor       TEXT NOT NULL,                 -- 'Edgar' | 'n8n' | 'system'
  action      VARCHAR(10) NOT NULL           -- INSERT / UPDATE / DELETE
              CHECK (action IN ('INSERT','UPDATE','DELETE')),
  entity      VARCHAR(40) NOT NULL,          -- 'patients' | 'appointments' | etc.
  entity_id   TEXT,                          -- id de la fila afectada (texto para soportar uuid/int)
  diff        JSONB,                         -- { before: {...}, after: {...} } o solo after en INSERT
  route       TEXT,                          -- e.g. 'POST /api/patients'
  ip          TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ts        ON audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity    ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor     ON audit_log(actor);
