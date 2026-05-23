import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/appointments', () => ({
  getAppointments: vi.fn(),
  getAppointmentsByPatient: vi.fn(),
  getAppointmentsByDateRange: vi.fn(),
  createAppointment: vi.fn(),
}));

vi.mock('@/lib/n8n', () => ({
  triggerN8n: vi.fn(),
}));

import * as apptData from '@/lib/data/appointments';
import { GET, POST } from '@/app/api/appointments/route';

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
