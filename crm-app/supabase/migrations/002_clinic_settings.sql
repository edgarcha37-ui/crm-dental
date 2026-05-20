-- ============================================================
-- 002_clinic_settings.sql
-- Configuración persistente del consultorio.
-- Una fila por "sección" (clinica, perfil, notificaciones) con un
-- JSONB para que la UI pueda agregar campos sin migración.
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_settings (
  section     VARCHAR(50) PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed con los valores que hoy están hardcodeados en la UI, así
-- /settings sigue mostrando algo razonable la primera vez.
INSERT INTO clinic_settings (section, data) VALUES
  ('clinica', '{
    "nombre": "Mi Consultorio",
    "direccion": "",
    "telefono": "",
    "correo": "",
    "horario_apertura": "09:00",
    "horario_cierre": "18:00",
    "dias_atencion": ["Lunes","Martes","Miércoles","Jueves","Viernes"]
  }'::jsonb),
  ('perfil', '{
    "nombre": "",
    "especialidad": "",
    "cedula": "",
    "universidad": "",
    "correo": "",
    "telefono": ""
  }'::jsonb),
  ('notificaciones', '{
    "recordatorio_cita": true,
    "confirmacion_cita": true,
    "cancelacion_cita": true,
    "pago_pendiente": true,
    "nuevo_paciente": false,
    "reporte_diario": true,
    "horas_anticipacion": "24"
  }'::jsonb)
ON CONFLICT (section) DO NOTHING;
