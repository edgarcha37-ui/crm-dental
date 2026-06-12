# DentalCRM

CRM dental moderno con automatizaciones. Stack: **Next.js 16 (App Router) + Supabase (Postgres + Storage) + n8n (workflows)**.

> **Estado actual (jun 2026):** producto en producción (https://crmbeta.orbitai.pro) con autodeploy GitHub→Dokploy. Fase 4 completada: odontograma, planes de tratamiento, PDF de facturas, import CSV, roles/permisos, audit log, CRUD de doctores y suite de tests (38 tests, incluye e2e del flujo principal). Único pendiente mayor: multi-clínica (ver §6).

---

## 1. Arquitectura en una imagen

```
┌──────────────────┐      cookie HMAC          ┌────────────────────┐
│  Navegador (UI)  │ ─────────────────────────►│  Next.js 16        │
│  React client    │                            │  - App Router       │
└──────────────────┘ ◄──────────────────────── │  - /api/* routes    │
                                                │  - middleware auth  │
                                                └──────────┬─────────┘
                                                           │ service_role
                                                           ▼
                                                ┌────────────────────┐
                                                │  Supabase          │
                                                │  - Postgres (DB)   │
                                                │  - Storage bucket  │
                                                │    "archivos-crm"  │
                                                └──────────┬─────────┘
                                                           │
                                                           │ webhooks
                                                           ▼
                                                ┌────────────────────┐
                                                │  n8n               │
                                                │  - recordatorio 24h│
                                                │  - paciente riesgo │
                                                │  - follow-up 7d    │
                                                │  - bienvenida      │
                                                └────────────────────┘
```

- **Auth propia**: HMAC SHA-256 con `Web Crypto`, sin libs externas. Cookie `httpOnly`/`SameSite=strict`. Middleware permite bypass con `x-internal-key` para llamadas desde n8n.
- **Una sola fuente de tipos**: `crm-app/src/types/` y validación `zod` en `crm-app/src/schemas/` en cada `route.ts`.
- **Vista `patients_with_summary`** elimina el N+1 que tenía `getPatients` antes (saldo, último tratamiento se calculan en SQL).
- **Cache 5 min** en `getLiveMetrics` para no recalcular en cada vista del dashboard.
- **Toast global** (`src/components/Toast.tsx`) para feedback de errores y éxitos; los pages lo consumen vía `useToast()`.

---

## 2. Estructura del repositorio

```
.
├── crm-app/                Aplicación Next.js (todo el código del producto)
│   ├── src/
│   │   ├── app/            Routes (UI + API)
│   │   ├── components/     UI reutilizable + layout + Toast
│   │   ├── lib/data/       Acceso a Supabase por entidad
│   │   ├── lib/dates.ts    Helpers DATE vs TIMESTAMP
│   │   ├── schemas/        Schemas zod
│   │   └── types/          Tipos compartidos del dominio
│   ├── supabase/migrations/ Migraciones SQL versionadas
│   └── public/
├── workflows/              Exports de workflows n8n (.json por ahora)
├── diseño/                 Mockups y referencias de diseño
├── .agent/                 Notas internas del agente (no es producto)
└── README.md               (este archivo)
```

---

## 3. Variables de entorno

Define `crm-app/.env.production` (y `.env.local` para desarrollo) con:

| Variable                          | Para qué                                                        |
|-----------------------------------|------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | URL del proyecto Supabase                                        |
| `SUPABASE_SERVICE_ROLE_KEY`       | Key `service_role` para llamadas server-side (no exponer)        |
| `CRM_USER`                        | Usuario único para `/login` (auth MVP)                           |
| `CRM_PASS`                        | Contraseña                                                       |
| `SESSION_SECRET`                  | Secreto para firmar la cookie HMAC                               |
| `INTERNAL_API_KEY`                | Bypass de auth para llamadas desde n8n (`x-internal-key` header) |
| `N8N_WEBHOOK_URL_BIENVENIDA`      | Webhook del workflow "bienvenida-paciente"                       |
| `N8N_WEBHOOK_URL_RECORDATORIO_24H`| Webhook del workflow "recordatorio cita 24h"                     |
| `N8N_WEBHOOK_URL_PACIENTE_RIESGO` | Webhook del workflow "paciente en riesgo"                        |
| `N8N_WEBHOOK_URL_FOLLOWUP`        | Webhook del workflow "follow-up 7 días"                          |

> **Nunca** commitees `.env.*`. Está en `.gitignore` de raíz.

---

## 4. Cómo arrancar el stack completo

### a) Base de datos (Supabase)

1. Crea un proyecto en Supabase (o usa uno existente).
2. Aplica las migraciones en orden:
   ```bash
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/001_init.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/002_clinic_settings.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/003_unify_notes_prioridad.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/004_doctors_and_lab_works.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/005_patients_summary_view.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/006_treatment_plans.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/007_odontograma.sql
   psql "$DATABASE_URL" -f crm-app/supabase/migrations/008_audit_log.sql
   ```
   (O pega su contenido en el SQL editor de Supabase, en orden).
3. El bucket `archivos-crm` se autocrea en el primer upload — no requiere acción.

### b) CRM (Next.js)

```bash
cd crm-app
npm install
cp .env.example .env.local   # llena las variables (sección 3)
npm run dev                  # http://localhost:3000
```

### c) n8n (workflows)

1. Levanta n8n local (Docker o `n8n start`).
2. Importa los workflows JSON desde `workflows/` en la UI de n8n.
3. En cada workflow:
   - Configura el header `x-internal-key` igual a `INTERNAL_API_KEY` del CRM.
   - Reemplaza `http://localhost:3000` con tu host real al deployar.
4. Copia las URLs de webhook a las variables `N8N_WEBHOOK_URL_*` del CRM.

---

## 5. Decisiones clave

- **Auth propia (HMAC) en vez de NextAuth**: producto single-tenant para una clínica, no justifica una librería. Cookie firmada con `Web Crypto`, secreto vía env, `SameSite=strict`.
- **Una sola tabla `clinic_settings`** con JSONB por sección: nombre/perfil/notificaciones. Evita migración al agregar campos.
- **Vista SQL `patients_with_summary`** en vez de RPC: leemos como cualquier tabla, sin código nuevo en cliente.
- **No usamos NextAuth, Prisma ni ORMs**: queries directas con el cliente `supabase-js`. Schema definido por SQL, tipos compartidos en TS.
- **zod en boundaries**: validación al entrar a `route.ts`, nada más adentro. Helper `zodErrorResponse` uniforma el shape de error.

---

## 6. Estado del blueprint (Fase 4)

Completado:

- ✅ **Server Components**: dashboard, pacientes, billing y métricas son RSC con interactividad en client subcomponents (`_components/`).
- ✅ **Odontograma interactivo** (`Odontograma.tsx`, migración 007).
- ✅ **Plan de tratamiento** como entidad agregadora de `treatments` (migración 006).
- ✅ **CRUD de doctores** desde UI (Configuración → Doctores).
- ✅ **PDF de facturas** local (`src/lib/invoice-pdf.ts`, jsPDF).
- ✅ **Importar pacientes desde CSV** (`PatientsImport.tsx` + `/api/patients/import`).
- ✅ **Permisos por rol** (`src/lib/permissions.ts`, `require-role.ts`).
- ✅ **Audit log** (migración 008).
- ✅ **Tests**: 38 tests con vitest (`crm-app/tests/`), incluye e2e del flujo paciente → tratamiento → cita → abono → dashboard (`tests/api/e2e-flow.test.ts`).

Pendiente (requiere decisión de negocio):

- ⏳ **Multi-clínica**: hoy el producto es single-tenant (una clínica por despliegue). Soportar varias clínicas implica re-modelar schema (clinic_id en todas las tablas), auth multiusuario real y aislamiento de datos.

---

## 7. Recursos internos

- `.agent/` — historial de fases del desarrollo asistido por agente (no documentación de producto).
- `diseño/` — mockups originales.
- `workflows/` — JSON de los workflows de n8n.
