-- ============================================================
-- 003_unify_notes_prioridad.sql
-- Unifica los valores de notes.prioridad a español (Alta/Media/Baja)
-- para que coincida con notas_operativas.prioridad y con la UI.
-- ============================================================

-- Normaliza datos existentes que usaban critical/high/medium/low.
UPDATE notes SET prioridad = 'Alta'  WHERE prioridad IN ('critical', 'high');
UPDATE notes SET prioridad = 'Media' WHERE prioridad IN ('medium');
UPDATE notes SET prioridad = 'Baja'  WHERE prioridad IN ('low');

-- Cualquier valor desconocido (NULL incluido) queda como 'Media' por defecto.
UPDATE notes SET prioridad = 'Media' WHERE prioridad IS NULL OR prioridad NOT IN ('Alta','Media','Baja');

-- Refuerza el dominio con un CHECK constraint, igual que notas_operativas.
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_prioridad_check;
ALTER TABLE notes ADD CONSTRAINT notes_prioridad_check
  CHECK (prioridad IN ('Alta','Media','Baja'));

-- Default razonable para inserts que omitan el campo.
ALTER TABLE notes ALTER COLUMN prioridad SET DEFAULT 'Media';
