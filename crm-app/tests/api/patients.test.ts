import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/patients', () => ({
  getPatients: vi.fn(),
  createPatient: vi.fn(),
  getPatientById: vi.fn(),
  searchPatients: vi.fn(),
  getPatientStats: vi.fn(),
}));

vi.mock('@/lib/n8n', () => ({
  triggerN8n: vi.fn(),
}));

import * as patientsData from '@/lib/data/patients';
import { GET, POST } from '@/app/api/patients/route';

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/patients', () => {
  it('lista pacientes', async () => {
    vi.mocked(patientsData.getPatients).mockResolvedValue([]);
    const res = await GET(makeRequest('http://test/api/patients'));
    expect(res.status).toBe(200);
  });

  it('busca con ?q=...', async () => {
    vi.mocked(patientsData.searchPatients).mockResolvedValue([]);
    await GET(makeRequest('http://test/api/patients?q=juan'));
    expect(patientsData.searchPatients).toHaveBeenCalledWith('juan');
  });

  it('devuelve stats con ?stats=true', async () => {
    vi.mocked(patientsData.getPatientStats).mockResolvedValue({ newThisMonth: 2, treatmentsDone: 5, pendingFollowups: 1 });
    const res = await GET(makeRequest('http://test/api/patients?stats=true'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ newThisMonth: 2 });
  });
});

describe('POST /api/patients', () => {
  it('rechaza payload sin nombre', async () => {
    const res = await POST(makeRequest('http://test/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono: '555' }),
    }));
    expect(res.status).toBe(400);
    expect(patientsData.createPatient).not.toHaveBeenCalled();
  });

  it('crea paciente válido', async () => {
    vi.mocked(patientsData.createPatient).mockResolvedValue({ id: 7 });
    const res = await POST(makeRequest('http://test/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Juan' }),
    }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: 7 });
  });
});
