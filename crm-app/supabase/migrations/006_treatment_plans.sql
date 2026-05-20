-- ============================================================
-- 006_treatment_plans.sql
-- Plan de tratamiento: agrupa varios `treatments` con un nombre,
-- estado global y secuencia. Permite cobrar abonos contra el plan
-- y reportar progreso ("3 de 6 pasos completados").
--
-- Diseño:
--   - 1 paciente puede tener varios planes (en progreso, completado, cancelado)
--   - 1 plan agrupa N treatments mediante treatments.plan_id (nullable)
--     → los tratamientos sueltos sin plan siguen funcionando
-- ============================================================

CREATE TABLE IF NOT EXISTS treatment_plans (
  id              SERIAL PRIMARY KEY,
  paciente_id     INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'En Progreso'
                  CHECK (estado IN ('Planeado','En Progreso','Completado','Cancelado','Suspendido')),
  fecha_inicio    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_estimada_fin DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_paciente_id ON treatment_plans(paciente_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_estado ON treatment_plans(estado);

-- Vincular treatments a un plan opcional + columna `orden` para la secuencia.
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES treatment_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS orden   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_treatments_plan_id ON treatments(plan_id);
