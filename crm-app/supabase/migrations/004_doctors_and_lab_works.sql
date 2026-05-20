-- ============================================================
-- 004_doctors_and_lab_works.sql
-- Agrega:
--   1) Tabla doctors (multi-doctor real, ya existía doctor_id en appointments)
--   2) Tabla lab_works (estatus de laboratorio real, reemplaza widget hardcoded)
--   3) Tabla patient_medical_history (alergias, medicamentos, padecimientos)
-- ============================================================

-- 1) DOCTORS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
  id            SERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  especialidad  TEXT,
  cedula        TEXT,
  correo        TEXT,
  telefono      TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_activo ON doctors(activo);

-- FK retroactiva: hace tiempo se agregó doctor_id a appointments pero sin FK.
-- Solo agregamos la constraint si no existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_doctor_id_fkey'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_doctor_id_fkey
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
END$$;


-- 2) LAB_WORKS --------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_works (
  id                SERIAL PRIMARY KEY,
  paciente_id       INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  tratamiento_id    INTEGER REFERENCES treatments(id) ON DELETE SET NULL,
  trabajo           TEXT NOT NULL,
  laboratorio       TEXT,
  estado            VARCHAR(30) NOT NULL DEFAULT 'En camino'
                    CHECK (estado IN ('En camino','Listo para colocar','Retrasado','Colocado','Cancelado')),
  fecha_envio       DATE,
  fecha_estimada    DATE,
  fecha_recepcion   DATE,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_works_paciente_id ON lab_works(paciente_id);
CREATE INDEX IF NOT EXISTS idx_lab_works_estado ON lab_works(estado);
CREATE INDEX IF NOT EXISTS idx_lab_works_fecha_estimada ON lab_works(fecha_estimada);


-- 3) HISTORIA CLÍNICA -------------------------------------------
-- Una fila por paciente (1:1). JSONB para listas dinámicas (alergias,
-- medicamentos, padecimientos) sin volver a migrar cada vez que cambien.
CREATE TABLE IF NOT EXISTS patient_medical_history (
  paciente_id          INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  alergias             JSONB NOT NULL DEFAULT '[]'::jsonb,
  medicamentos_cronicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  padecimientos        JSONB NOT NULL DEFAULT '[]'::jsonb,
  tipo_sangre          VARCHAR(5),
  notas_clinicas       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
