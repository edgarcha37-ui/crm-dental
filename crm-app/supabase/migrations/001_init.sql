-- ============================================================
-- CRM DENTAL — Migración consolidada inicial (idempotente)
-- Ejecutar en Supabase self-hosted (db.orbitai.pro)
--   1) Studio → SQL Editor → pegar todo y ejecutar
--   2) o psql: psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PACIENTES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id                SERIAL PRIMARY KEY,
  nombre            TEXT NOT NULL,
  telefono          TEXT,
  correo            TEXT,
  direccion         TEXT,
  sexo              TEXT,
  fecha_nacimiento  DATE,
  fuente_captacion  TEXT DEFAULT 'Otro',
  notas_generales   TEXT,
  archivado         BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_registro    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_archivado ON patients(archivado);
CREATE INDEX IF NOT EXISTS idx_patients_fecha_registro ON patients(fecha_registro DESC);

-- ----------------------------------------------------------------
-- 2. TRATAMIENTOS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatments (
  id                  SERIAL PRIMARY KEY,
  paciente_id         INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nombre_tratamiento  TEXT NOT NULL,
  estatus             VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
  costo_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_pagado        NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_treatments_paciente ON treatments(paciente_id);
CREATE INDEX IF NOT EXISTS idx_treatments_estatus ON treatments(estatus);

ALTER TABLE treatments DROP CONSTRAINT IF EXISTS treatments_estatus_check;
ALTER TABLE treatments ADD CONSTRAINT treatments_estatus_check
  CHECK (estatus IN ('Pendiente','En Progreso','Completado','Cancelado','Suspendido'));

-- ----------------------------------------------------------------
-- 3. CITAS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  paciente_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  fecha            DATE NOT NULL,
  hora_inicio      TIME NOT NULL,
  hora_fin         TIME,
  motivo           TEXT,
  estado           VARCHAR(20) DEFAULT 'Confirmada',
  google_event_id  TEXT,
  duracion         INTEGER DEFAULT 30,
  motivo_consulta  TEXT,
  notas_clinicas   TEXT,
  fuente           VARCHAR(30) DEFAULT 'Manual',
  doctor_id        INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_paciente ON appointments(paciente_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha ON appointments(fecha);

-- Columna derivada fecha_hora — el módulo de riesgo la consulta.
-- TIMESTAMP (sin tz) para que la expresión sea IMMUTABLE; el front la parsea
-- igualmente con new Date(...).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMP
  GENERATED ALWAYS AS (fecha + COALESCE(hora_inicio, '00:00'::time)) STORED;
CREATE INDEX IF NOT EXISTS idx_appointments_fecha_hora ON appointments(fecha_hora DESC);

-- ----------------------------------------------------------------
-- 4. FACTURAS / ABONOS (módulo financiero, sin timbrado CFDI por ahora)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                SERIAL PRIMARY KEY,
  paciente_id       INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tratamiento_id    INTEGER REFERENCES treatments(id) ON DELETE SET NULL,
  razon_social      TEXT,
  rfc               TEXT,
  direccion_fiscal  TEXT,
  uso_cfdi          TEXT,
  monto             NUMERIC(12,2) NOT NULL,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_factura    TEXT,
  concepto          TEXT,
  tipo              VARCHAR(20) DEFAULT 'factura',
  estatus           VARCHAR(20) DEFAULT 'Pendiente',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_paciente ON invoices(paciente_id);
CREATE INDEX IF NOT EXISTS idx_invoices_estatus ON invoices(estatus);
CREATE INDEX IF NOT EXISTS idx_invoices_fecha ON invoices(fecha DESC);

-- ----------------------------------------------------------------
-- 5. NOTAS CLÍNICAS DE PACIENTE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id                 SERIAL PRIMARY KEY,
  paciente_id        INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  titulo             TEXT,
  contenido          TEXT NOT NULL,
  tipo               TEXT,
  prioridad          VARCHAR(20),
  categoria          TEXT,
  completada         BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_vencimiento  DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_paciente ON notes(paciente_id);

-- ----------------------------------------------------------------
-- 6. NOTAS OPERATIVAS (suministros / mantenimiento / laboratorio)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas_operativas (
  id                 SERIAL PRIMARY KEY,
  usuario_id         INTEGER,
  titulo             TEXT NOT NULL,
  categoria          VARCHAR(20) NOT NULL
                     CHECK (categoria IN ('Suministros','Mantenimiento','Laboratorio')),
  prioridad          VARCHAR(10) NOT NULL DEFAULT 'Media'
                     CHECK (prioridad IN ('Alta','Media','Baja')),
  completada         BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_vencimiento  DATE
);
CREATE INDEX IF NOT EXISTS idx_notas_op_completada ON notas_operativas(completada);
CREATE INDEX IF NOT EXISTS idx_notas_op_prioridad ON notas_operativas(prioridad);

-- ----------------------------------------------------------------
-- 7. MÉTRICAS DEL DASHBOARD
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrics (
  id            SERIAL PRIMARY KEY,
  metric_key    TEXT NOT NULL,
  metric_value  NUMERIC(14,2) NOT NULL,
  metric_label  TEXT,
  periodo       TEXT NOT NULL,
  rango         VARCHAR(20) NOT NULL DEFAULT 'mensual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrics_key ON metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_metrics_periodo ON metrics(periodo);

-- ----------------------------------------------------------------
-- 8. BUSINESS INSIGHTS (para n8n / AI)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_insights (
  id              SERIAL PRIMARY KEY,
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  categoria       VARCHAR(20) NOT NULL
                  CHECK (categoria IN ('Marketing','Operaciones','Retención')),
  titulo          TEXT NOT NULL,
  contenido       TEXT NOT NULL,
  accion_sugerida TEXT,
  visto           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 9. ARCHIVOS CLÍNICOS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archivos_paciente (
  id             SERIAL PRIMARY KEY,
  paciente_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  url_publica    TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  tipo_archivo   TEXT,
  peso_archivo   BIGINT,
  categoria      VARCHAR(50) DEFAULT 'General',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_archivos_paciente ON archivos_paciente(paciente_id);

-- ----------------------------------------------------------------
-- 10. TRIGGER de updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['patients','treatments','appointments','invoices','notes'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 11. SEED de demo (Smart Insights + Métricas)
-- ----------------------------------------------------------------
INSERT INTO business_insights (categoria, titulo, contenido, accion_sugerida)
SELECT 'Marketing',
       'Instagram supera a Facebook en 20%',
       'El canal de Instagram genera un 20% más de pacientes nuevos comparado con Facebook en los últimos 3 meses.',
       'Optimizar pauta en Instagram enfocando en ''Diseño de Sonrisa''.'
WHERE NOT EXISTS (
  SELECT 1 FROM business_insights WHERE titulo = 'Instagram supera a Facebook en 20%'
);

INSERT INTO business_insights (categoria, titulo, contenido, accion_sugerida)
SELECT 'Retención',
       '12 pacientes de ortodoncia sin cita de seguimiento',
       'Se detectaron 12 pacientes con tratamiento de ortodoncia activo que no tienen cita programada en los próximos 30 días.',
       'Lanzar campaña de WhatsApp con mensaje personalizado.'
WHERE NOT EXISTS (
  SELECT 1 FROM business_insights WHERE titulo = '12 pacientes de ortodoncia sin cita de seguimiento'
);

-- Métricas (limpia primero las claves seed para no duplicar al re-ejecutar)
DELETE FROM metrics WHERE metric_key IN (
  'revenue_mensual','growth_trend','canal_adquisicion',
  'ingresos_totales','ingresos_totales_anterior',
  'pacientes_nuevos','pacientes_nuevos_anterior',
  'citas_totales','tasa_asistencia',
  'tasa_retencion','noshow_rate','tratamiento_popular'
);

INSERT INTO metrics (metric_key, metric_value, metric_label, periodo, rango) VALUES
('revenue_mensual', 32000, 'May', '2024-05', 'mensual'),
('revenue_mensual', 28500, 'Jun', '2024-06', 'mensual'),
('revenue_mensual', 35000, 'Jul', '2024-07', 'mensual'),
('revenue_mensual', 31000, 'Ago', '2024-08', 'mensual'),
('revenue_mensual', 29000, 'Sep', '2024-09', 'mensual'),
('revenue_mensual', 33000, 'Oct', '2024-10', 'mensual'),
('revenue_mensual', 38000, 'Nov', '2024-11', 'mensual'),
('revenue_mensual', 45000, 'Dic', '2024-12', 'mensual'),
('revenue_mensual', 27000, 'Ene', '2025-01', 'mensual'),
('revenue_mensual', 24000, 'Feb', '2025-02', 'mensual'),
('revenue_mensual', 36000, 'Mar', '2025-03', 'mensual'),
('revenue_mensual', 41000, 'Abr', '2025-04', 'mensual'),
('growth_trend', 38,  'May', '2024-05', 'mensual'),
('growth_trend', 45,  'Jun', '2024-06', 'mensual'),
('growth_trend', 62,  'Jul', '2024-07', 'mensual'),
('growth_trend', 78,  'Ago', '2024-08', 'mensual'),
('growth_trend', 91,  'Sep', '2024-09', 'mensual'),
('growth_trend', 110, 'Oct', '2024-10', 'mensual'),
('growth_trend', 138, 'Nov', '2024-11', 'mensual'),
('growth_trend', 175, 'Dic', '2024-12', 'mensual'),
('growth_trend', 198, 'Ene', '2025-01', 'mensual'),
('growth_trend', 218, 'Feb', '2025-02', 'mensual'),
('growth_trend', 251, 'Mar', '2025-03', 'mensual'),
('growth_trend', 289, 'Abr', '2025-04', 'mensual'),
('canal_adquisicion', 38, 'Instagram', '2025-04', 'mensual'),
('canal_adquisicion', 22, 'Facebook',  '2025-04', 'mensual'),
('canal_adquisicion', 28, 'Referido',  '2025-04', 'mensual'),
('canal_adquisicion', 12, 'Google',    '2025-04', 'mensual'),
('ingresos_totales',          45280, 'Ingresos Totales',      '2025-04', 'mensual'),
('ingresos_totales_anterior', 41000, 'Ingresos Mes Anterior', '2025-03', 'mensual'),
('pacientes_nuevos',            128, 'Pacientes Nuevos',      '2025-04', 'mensual'),
('pacientes_nuevos_anterior',   112, 'Pacientes Nuevos Ant.', '2025-03', 'mensual'),
('citas_totales',               482, 'Citas Totales',         '2025-04', 'mensual'),
('tasa_asistencia',              87, 'Tasa Asistencia',       '2025-04', 'mensual'),
('tasa_retencion',               73, 'Tasa Retención',        '2025-04', 'mensual'),
('noshow_rate',                  13, 'No-Show Rate',          '2025-04', 'mensual'),
('tratamiento_popular', 89, 'Check-up & Clean', '2025-04', 'mensual'),
('tratamiento_popular', 76, 'Teeth Whitening',  '2025-04', 'mensual'),
('tratamiento_popular', 64, 'Dental Implants',  '2025-04', 'mensual'),
('tratamiento_popular', 52, 'Root Canal',       '2025-04', 'mensual'),
('tratamiento_popular', 41, 'Braces',           '2025-04', 'mensual');

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'patients'           AS tabla, COUNT(*) FROM patients
UNION ALL SELECT 'treatments',         COUNT(*) FROM treatments
UNION ALL SELECT 'appointments',       COUNT(*) FROM appointments
UNION ALL SELECT 'invoices',           COUNT(*) FROM invoices
UNION ALL SELECT 'notes',              COUNT(*) FROM notes
UNION ALL SELECT 'notas_operativas',   COUNT(*) FROM notas_operativas
UNION ALL SELECT 'metrics',            COUNT(*) FROM metrics
UNION ALL SELECT 'business_insights',  COUNT(*) FROM business_insights
UNION ALL SELECT 'archivos_paciente',  COUNT(*) FROM archivos_paciente;
