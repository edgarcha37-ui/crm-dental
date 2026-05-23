import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/invoices', () => ({
  getInvoices: vi.fn(),
  getInvoicesByPatient: vi.fn(),
  createInvoice: vi.fn(),
  getInvoiceStats: vi.fn(),
}));

import * as invData from '@/lib/data/invoices';
import { GET, POST } from '@/app/api/invoices/route';

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/invoices', () => {
  it('lista por defecto', async () => {
    vi.mocked(invData.getInvoices).mockResolvedValue([]);
    const res = await GET(makeRequest('http://test/api/invoices'));
    expect(res.status).toBe(200);
    expect(invData.getInvoices).toHaveBeenCalled();
  });

  it('stats=true devuelve estadísticas', async () => {
    vi.mocked(invData.getInvoiceStats).mockResolvedValue({ pagadas: 5, pendientes: 2, totalMes: 1000 });
    const res = await GET(makeRequest('http://test/api/invoices?stats=true'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ pagadas: 5 });
  });

  it('paciente_id usa filtro por paciente', async () => {
    vi.mocked(invData.getInvoicesByPatient).mockResolvedValue([]);
    await GET(makeRequest('http://test/api/invoices?paciente_id=42'));
    expect(invData.getInvoicesByPatient).toHaveBeenCalledWith(42);
  });
});

describe('POST /api/invoices', () => {
  it('rechaza sin monto', async () => {
    const res = await POST(makeRequest('http://test/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: 1 }),
    }));
    expect(res.status).toBe(400);
  });

  it('rechaza monto negativo', async () => {
    const res = await POST(makeRequest('http://test/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: 1, monto: -50 }),
    }));
    expect(res.status).toBe(400);
  });

  it('crea con monto válido', async () => {
    vi.mocked(invData.createInvoice).mockResolvedValue({ id: 9 });
    const res = await POST(makeRequest('http://test/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: 1, monto: 1500 }),
    }));
    expect(res.status).toBe(201);
  });
});
