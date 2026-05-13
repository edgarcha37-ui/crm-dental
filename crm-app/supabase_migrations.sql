-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR (supabase.com → tu proyecto → SQL Editor)
-- ============================================================

-- 1. Actualizar constraint de estatus en treatments
--    (permite todos los estados que usa el CRM)
ALTER TABLE treatments DROP CONSTRAINT IF EXISTS treatments_estatus_check;
ALTER TABLE treatments ADD CONSTRAINT treatments_estatus_check 
  CHECK (estatus IN ('Pendiente', 'En Progreso', 'Completado', 'Cancelado', 'Suspendido'));

-- 2. Tabla de datos fiscales para facturación electrónica
CREATE TABLE IF NOT EXISTS datos_fiscales_pacientes (
  id            SERIAL PRIMARY KEY,
  paciente_id   INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  rfc           VARCHAR(13) NOT NULL,
  razon_social  TEXT NOT NULL,
  regimen_fiscal VARCHAR(10) NOT NULL,
  codigo_postal  VARCHAR(5) NOT NULL,
  uso_cfdi      VARCHAR(10) NOT NULL DEFAULT 'G03',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paciente_id)
);

-- 3. Tabla de facturas electrónicas
CREATE TABLE IF NOT EXISTS facturas (
  id             SERIAL PRIMARY KEY,
  paciente_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tratamiento_id INTEGER REFERENCES treatments(id),
  monto_total    NUMERIC(12,2) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
                   CHECK (status IN ('pendiente','timbrada','error','cancelada')),
  url_pdf        TEXT,
  url_xml        TEXT,
  external_id    TEXT,
  concepto       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de archivos clínicos
CREATE TABLE IF NOT EXISTS archivos_paciente (
  id             SERIAL PRIMARY KEY,
  paciente_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  url_publica    TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  tipo_archivo   TEXT,
  peso_archivo   BIGINT,
  categoria      VARCHAR(50) DEFAULT 'General',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Campos nuevos en appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duracion        INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS motivo_consulta TEXT,
  ADD COLUMN IF NOT EXISTS notas_clinicas  TEXT,
  ADD COLUMN IF NOT EXISTS fuente          VARCHAR(30) DEFAULT 'Manual',
  ADD COLUMN IF NOT EXISTS doctor_id       INTEGER;

-- ============================================================
-- VERIFICACIÓN: Confirmar que el constraint se actualizó
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'treatments_estatus_check';
-- Debe mostrar: CHECK ((estatus = ANY (ARRAY[...]))) con todos los valores
-- ============================================================
