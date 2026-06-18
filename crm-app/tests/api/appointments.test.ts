import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/appointments', () => ({
  getAppointments: vi.fn(),
  getAppointmentsByPatient: vi.fn(),
  getAppointmentsByDateRange: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
}));

vi.mock('@/lib/n8n', () => ({
  triggerN8n: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 1, estado: 'Pendiente', fecha: '2026-06-18' }, error: null }),
        }),
      }),
    }),
  })),
}));

import * as apptData from '@/lib/data/appointments';
import { GET, POST } from '@/app/api/appointments/route';
import { PUT } from '@/app/api/appointments/[id]/route';

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/appointments', () => {
  it('lista default', async () => {
    vi.mocked(apptData.getAppointments).mockResolvedValue([]);
    const res = await GET(makeRequest('http://test/api/appointments'));
    expect(res.status).toBe(200);
  });

  it('paciente_id filtra', async () => {
    vi.mocked(apptData.getAppointmentsByPatient).mockResolvedValue([]);
    await GET(makeRequest('http://test/api/appointments?paciente_id=5'));
    expect(apptData.getAppointmentsByPatient).toHaveBeenCalledWith(5);
  });
});

describe('POST /api/appointments', () => {
  it('rechaza sin campos requeridos', async () => {
    const res = await POST(makeRequest('http://test/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
    expect(apptData.createAppointment).not.toHaveBeenCalled();
  });

  it('rechaza fecha inválida', async () => {
    const res = await POST(makeRequest('http://test/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: 1,
        fecha: 'no-es-fecha',
        hora_inicio: '10:00',
        hora_fin: '10:30',
        motivo: 'Limpieza',
      }),
    }));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/appointments/[id]', () => {
  function makePutRequest(body: unknown) {
    return new Request('http://test/api/appointments/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as Parameters<typeof PUT>[0];
  }

  const params = Promise.resolve({ id: '1' });

  it('cambia estado correctamente', async () => {
    vi.mocked(apptData.updateAppointment).mockResolvedValue(undefined);
    const res = await PUT(makePutRequest({ estado: 'Confirmada' }), { params });
    expect(res.status).toBe(200);
    expect(apptData.updateAppointment).toHaveBeenCalledWith(1, { estado: 'Confirmada' });
  });

  it('rechaza estado inválido', async () => {
    const res = await PUT(makePutRequest({ estado: 'Inventado' }), { params });
    expect(res.status).toBe(400);
    expect(apptData.updateAppointment).not.toHaveBeenCalled();
  });

  it('rechaza ID inválido', async () => {
    const res = await PUT(makePutRequest({ estado: 'Confirmada' }), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });
});
