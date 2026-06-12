/**
 * Test de integración end-to-end del flujo principal del CRM
 * (el que pide el blueprint en README §6):
 *
 *   crear paciente → crear tratamiento → agendar cita → registrar abonos
 *   → verificar que el dashboard (stats de citas y facturación) lo refleja.
 *
 * Ejercita las route handlers REALES y la capa lib/data REAL; solo se
 * reemplaza el cliente Supabase por una BD fake en memoria.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', async () => {
  const { FakeSupabase } = await import('../helpers/fake-supabase');
  const fake = new FakeSupabase();
  return {
    supabase: fake,
    getSupabaseAdmin: () => fake,
  };
});

vi.mock('@/lib/n8n', () => ({
  triggerN8n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
  getActorFromRequest: () => 'test',
  getIpFromRequest: () => undefined,
}));

import { POST as createPatientRoute } from '@/app/api/patients/route';
import { POST as createTreatmentRoute } from '@/app/api/treatments/route';
import { POST as createAppointmentRoute, GET as getAppointmentsRoute } from '@/app/api/appointments/route';
import { POST as createAbonoRoute } from '@/app/api/abonos/route';
import { GET as getInvoicesRoute } from '@/app/api/invoices/route';
import { todayDateOnly } from '@/lib/dates';

function post(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof createPatientRoute>[0];
}

function get(url: string) {
  return new Request(url) as unknown as Parameters<typeof getInvoicesRoute>[0];
}

describe('E2E: paciente → tratamiento → cita → abono → dashboard', () => {
  let pacienteId: number;
  let tratamientoId: number;

  it('1. crea el paciente', async () => {
    const res = await createPatientRoute(post('http://test/api/patients', {
      nombre: 'Juan Pérez E2E',
      telefono: '5512345678',
      correo: 'juan.e2e@test.mx',
      fuente_captacion: 'Recomendación',
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeGreaterThan(0);
    pacienteId = body.id;
  });

  it('2. crea un tratamiento de $5,000', async () => {
    const res = await createTreatmentRoute(post('http://test/api/treatments', {
      paciente_id: pacienteId,
      nombre_tratamiento: 'Endodoncia',
      costo_total: 5000,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    tratamientoId = body.id;
  });

  it('3. agenda una cita para hoy', async () => {
    const res = await createAppointmentRoute(post('http://test/api/appointments', {
      paciente_id: pacienteId,
      fecha: todayDateOnly(),
      hora_inicio: '10:00',
      hora_fin: '10:30',
      motivo: 'Endodoncia — primera sesión',
      duracion: 30,
    }));
    expect(res.status).toBe(201);
  });

  it('4. el contador de citas de hoy refleja la cita', async () => {
    const res = await getAppointmentsRoute(get('http://test/api/appointments?count=today'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ count: 1 });
  });

  it('5. registra un abono parcial de $2,000', async () => {
    const res = await createAbonoRoute(post('http://test/api/abonos', {
      tratamiento_id: tratamientoId,
      paciente_id: pacienteId,
      monto: 2000,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nuevo_monto_pagado).toBe(2000);
    expect(body.saldo_restante).toBe(3000);
    expect(body.nuevo_estatus).not.toBe('Completado');
  });

  it('6. liquida con un segundo abono de $3,000 y el tratamiento queda Completado', async () => {
    const res = await createAbonoRoute(post('http://test/api/abonos', {
      tratamiento_id: tratamientoId,
      paciente_id: pacienteId,
      monto: 3000,
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nuevo_monto_pagado).toBe(5000);
    expect(body.saldo_restante).toBe(0);
    expect(body.nuevo_estatus).toBe('Completado');
  });

  it('7. el dashboard de facturación refleja los $5,000 cobrados', async () => {
    const res = await getInvoicesRoute(get('http://test/api/invoices?stats=true'));
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.monthlyIncome).toBe(5000);
    expect(stats.pendingPayments).toBe(0);
  });

  it('8. rechaza abonos a tratamientos inexistentes', async () => {
    const res = await createAbonoRoute(post('http://test/api/abonos', {
      tratamiento_id: 99999,
      paciente_id: pacienteId,
      monto: 100,
    }));
    expect(res.status).toBe(404);
  });
});
