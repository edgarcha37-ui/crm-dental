-- ============================================================
-- 007_odontograma.sql
-- Odontograma por paciente. Una fila por paciente con JSONB que
-- mapea fdi (string, ej "11", "47") -> { estado, notas, fecha }.
--
-- Numeración FDI estándar:
--   Cuadrante 1 (sup. der): 18..11
--   Cuadrante 2 (sup. izq): 21..28
--   Cuadrante 3 (inf. izq): 38..31
--   Cuadrante 4 (inf. der): 41..48
--
-- Estados permitidos los enforcea la UI; aquí JSONB libre para
-- agregar/quitar opciones sin migrar.
-- ============================================================

CREATE TABLE IF NOT EXISTS odontograma (
  paciente_id   INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  dientes       JSONB NOT NULL DEFAULT '{}'::jsonb,
  observaciones TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
