-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Dashboard BI Dental — business_insights + seed data
-- ============================================================

-- 1. Eliminar la restricción de rango temporalmente si existe para evitar errores
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_rango_check;

-- 2. Tabla de Smart Insights (para AI / n8n)
CREATE TABLE IF NOT EXISTS business_insights (
  id              SERIAL PRIMARY KEY,
  fecha           TIMESTAMPTZ DEFAULT NOW(),
  categoria       VARCHAR(20) NOT NULL CHECK (categoria IN ('Marketing', 'Operaciones', 'Retención')),
  titulo          TEXT NOT NULL,
  contenido       TEXT NOT NULL,
  accion_sugerida TEXT,
  visto           BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Datos de demo para Smart Insights
INSERT INTO business_insights (categoria, titulo, contenido, accion_sugerida, visto) VALUES
(
  'Marketing',
  'Instagram supera a Facebook en 20%',
  'El canal de Instagram genera un 20% más de pacientes nuevos comparado con Facebook en los últimos 3 meses. La mayoría proviene de contenido relacionado con "Diseño de Sonrisa".',
  'Optimizar pauta en Instagram enfocando en ''Diseño de Sonrisa''. Reducir presupuesto de Facebook un 15% y redirigirlo a Instagram Stories.',
  false
),
(
  'Retención',
  '12 pacientes de ortodoncia sin cita de seguimiento',
  'Se detectaron 12 pacientes con tratamiento de ortodoncia activo que no tienen cita programada en los próximos 30 días. El ticket promedio de este grupo es $8,400 MXN.',
  'Lanzar campaña de WhatsApp con mensaje personalizado. Ofrecer horario especial de seguimiento los sábados por la mañana.',
  false
);

-- 3. Seed data: métricas de 12 meses
-- Limpiar primero para evitar duplicados en re-ejecución
DELETE FROM metrics WHERE metric_key IN (
  'revenue_mensual', 'growth_trend', 'canal_adquisicion',
  'ingresos_totales', 'ingresos_totales_anterior',
  'pacientes_nuevos', 'pacientes_nuevos_anterior',
  'citas_totales', 'tasa_asistencia',
  'tasa_retencion', 'noshow_rate', 'tratamiento_popular'
);

-- Revenue mensual (picos en Jul, Dic; bajos en Feb, Sep)
INSERT INTO metrics (metric_key, metric_value, metric_label, periodo, rango) VALUES
('revenue_mensual', 32000, 'May',  '2024-05', 'mensual'),
('revenue_mensual', 28500, 'Jun',  '2024-06', 'mensual'),
('revenue_mensual', 35000, 'Jul',  '2024-07', 'mensual'),
('revenue_mensual', 31000, 'Ago',  '2024-08', 'mensual'),
('revenue_mensual', 29000, 'Sep',  '2024-09', 'mensual'),
('revenue_mensual', 33000, 'Oct',  '2024-10', 'mensual'),
('revenue_mensual', 38000, 'Nov',  '2024-11', 'mensual'),
('revenue_mensual', 45000, 'Dic',  '2024-12', 'mensual'),
('revenue_mensual', 27000, 'Ene',  '2025-01', 'mensual'),
('revenue_mensual', 24000, 'Feb',  '2025-02', 'mensual'),
('revenue_mensual', 36000, 'Mar',  '2025-03', 'mensual'),
('revenue_mensual', 41000, 'Abr',  '2025-04', 'mensual');

-- Growth trend: acumulado de pacientes
INSERT INTO metrics (metric_key, metric_value, metric_label, periodo, rango) VALUES
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
('growth_trend', 289, 'Abr', '2025-04', 'mensual');

-- Canales de adquisición (donut chart)
INSERT INTO metrics (metric_key, metric_value, metric_label, periodo, rango) VALUES
('canal_adquisicion', 38, 'Instagram', '2025-04', 'mensual'),
('canal_adquisicion', 22, 'Facebook',  '2025-04', 'mensual'),
('canal_adquisicion', 28, 'Referido',  '2025-04', 'mensual'),
('canal_adquisicion', 12, 'Google',    '2025-04', 'mensual');

-- KPIs globales actuales
INSERT INTO metrics (metric_key, metric_value, metric_label, periodo, rango) VALUES
('ingresos_totales',           45280, 'Ingresos Totales',        '2025-04', 'mensual'),
('ingresos_totales_anterior',  41000, 'Ingresos Mes Anterior',   '2025-03', 'mensual'),
('pacientes_nuevos',             128, 'Pacientes Nuevos',        '2025-04', 'mensual'),
('pacientes_nuevos_anterior',    112, 'Pacientes Nuevos Ant.',   '2025-03', 'mensual'),
('citas_totales',                482, 'Citas Totales',           '2025-04', 'mensual'),
('tasa_asistencia',               87, 'Tasa Asistencia',         '2025-04', 'mensual'),
('tasa_retencion',                73, 'Tasa Retención',          '2025-04', 'mensual'),
('noshow_rate',                   13, 'No-Show Rate',            '2025-04', 'mensual');

-- Tratamientos populares
INSERT INTO metrics (metric_key, metric_value, metric_label, periodo, rango) VALUES
('tratamiento_popular', 89, 'Check-up & Clean',  '2025-04', 'mensual'),
('tratamiento_popular', 76, 'Teeth Whitening',   '2025-04', 'mensual'),
('tratamiento_popular', 64, 'Dental Implants',   '2025-04', 'mensual'),
('tratamiento_popular', 52, 'Root Canal',        '2025-04', 'mensual'),
('tratamiento_popular', 41, 'Braces',            '2025-04', 'mensual');

-- ============================================================
-- 10. Datos dinámicos para métricas en vivo (Mes Actual)
-- ============================================================

-- A. Ingresos del mes actual (Facturas/Abonos pagados)
INSERT INTO invoices (paciente_id, monto, fecha, concepto, tipo, estatus)
SELECT id, 5000, CURRENT_DATE, 'Abono Ortodoncia', 'abono', 'Pagada' 
FROM patients LIMIT 1;

INSERT INTO invoices (paciente_id, monto, fecha, concepto, tipo, estatus)
SELECT id, 12500, CURRENT_DATE - INTERVAL '2 days', 'Implante Fase 1', 'abono', 'Pagada' 
FROM patients ORDER BY id DESC LIMIT 1;

-- B. Citas de los últimos 30 días (Para Tasa de Seguimiento)
-- Creamos citas pasadas (hace 5 días)
INSERT INTO appointments (paciente_id, fecha, hora_inicio, hora_fin, motivo, estado)
SELECT id, CURRENT_DATE - INTERVAL '5 days', '10:00', '11:00', 'Revisión General', 'Completada'
FROM patients LIMIT 5;

-- C. Citas futuras (Solo a 2 de esos 5 pacientes para dar una tasa de ~40% < 60%)
INSERT INTO appointments (paciente_id, fecha, hora_inicio, hora_fin, motivo, estado)
SELECT id, CURRENT_DATE + INTERVAL '15 days', '10:00', '11:00', 'Seguimiento', 'Confirmada'
FROM patients LIMIT 2;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT categoria, titulo FROM business_insights;
SELECT metric_key, COUNT(*) FROM metrics GROUP BY metric_key ORDER BY metric_key;
-- ============================================================
