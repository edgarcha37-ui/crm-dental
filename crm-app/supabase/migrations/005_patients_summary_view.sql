-- ============================================================
-- 005_patients_summary_view.sql
-- Vista que agrega último tratamiento, estatus y saldo pendiente
-- por paciente. Reemplaza el N+1 de getPatients (que traía todos
-- los pacientes + todos los tratamientos y los unía en JS).
--
-- DISTINCT ON (paciente_id) ordenado por id DESC nos da el
-- tratamiento más reciente (el de mayor id).
-- ============================================================

CREATE OR REPLACE VIEW patients_with_summary AS
WITH agg AS (
    SELECT
        paciente_id,
        SUM(GREATEST(0, COALESCE(costo_total, 0) - COALESCE(monto_pagado, 0))) AS saldo_pendiente
    FROM treatments
    GROUP BY paciente_id
),
ultimos AS (
    SELECT DISTINCT ON (paciente_id)
        paciente_id,
        nombre_tratamiento,
        estatus
    FROM treatments
    ORDER BY paciente_id, id DESC
)
SELECT
    p.*,
    u.nombre_tratamiento  AS ultimo_tratamiento,
    u.estatus             AS estatus_tratamiento,
    COALESCE(a.saldo_pendiente, 0) AS saldo_pendiente
FROM patients p
LEFT JOIN ultimos u ON u.paciente_id = p.id
LEFT JOIN agg     a ON a.paciente_id = p.id;

COMMENT ON VIEW patients_with_summary IS
    'Pacientes con resumen calculado: último tratamiento, estatus y saldo pendiente. Usar en lugar de getPatients + join en JS.';
