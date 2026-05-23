import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data/doctors', () => ({
  getDoctors: vi.fn(),
  getDoctorById: vi.fn(),
  createDoctor: vi.fn(),
  updateDoctor: vi.fn(),
  deleteDoctor: vi.fn(),
}));

import * as doctorsData from '@/lib/data/doctors';
import { GET, POST } from '@/app/api/doctors/route';
import { GET as GET_ID, PUT as PUT_ID, DELETE as DELETE_ID } from '@/app/api/doctors/[id]/route';

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/doctors', () => {
  it('devuelve lista de doctores', async () => {
    vi.mocked(doctorsData.getDoctors).mockResolvedValue([
      { id: 1, nombre: 'Dr. A', especialidad: 'Endo', cedula: null, correo: null, telefono: null, activo: true, created_at: '', updated_at: '' },
    ]);
    const res = await GET(makeRequest('http://test/api/doctors'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].nombre).toBe('Dr. A');
  });

  it('incluir_inactivos=true pasa false a getDoctors (no filtra activos)', async () => {
    vi.mocked(doctorsData.getDoctors).mockResolvedValue([]);
    await GET(makeRequest('http://test/api/doctors?incluir_inactivos=true'));
    expect(doctorsData.getDoctors).toHaveBeenCalledWith(false);
  });

  it('sin param filtra solo activos', async () => {
    vi.mocked(doctorsData.getDoctors).mockResolvedValue([]);
    await GET(makeRequest('http://test/api/doctors'));
    expect(doctorsData.getDoctors).toHaveBeenCalledWith(true);
  });
});

describe('POST /api/doctors', () => {
  it('crea doctor con datos válidos', async () => {
    vi.mocked(doctorsData.createDoctor).mockResolvedValue({ id: 42 });
    const res = await POST(makeRequest('http://test/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Dr. Test', especialidad: 'General' }),
    }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 42 });
  });

  it('rechaza payload sin nombre con 400', async () => {
    const res = await POST(makeRequest('http://test/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ especialidad: 'X' }),
    }));
    expect(res.status).toBe(400);
    expect(doctorsData.createDoctor).not.toHaveBeenCalled();
  });

  it('responde 500 si data layer truena', async () => {
    vi.mocked(doctorsData.createDoctor).mockRejectedValue(new Error('boom'));
    const res = await POST(makeRequest('http://test/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Dr. Test' }),
    }));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/doctors/[id]', () => {
  it('devuelve 404 cuando no existe', async () => {
    vi.mocked(doctorsData.getDoctorById).mockResolvedValue(undefined);
    const res = await GET_ID(makeRequest('http://test/api/doctors/99'), {
      params: Promise.resolve({ id: '99' }),
    });
    expect(res.status).toBe(404);
  });

  it('devuelve 400 con id inválido', async () => {
    const res = await GET_ID(makeRequest('http://test/api/doctors/abc'), {
      params: Promise.resolve({ id: 'abc' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/doctors/[id]', () => {
  it('actualiza doctor', async () => {
    vi.mocked(doctorsData.updateDoctor).mockResolvedValue(undefined);
    const res = await PUT_ID(
      makeRequest('http://test/api/doctors/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: '555' }),
      }),
      { params: Promise.resolve({ id: '1' }) }
    );
    expect(res.status).toBe(200);
    expect(doctorsData.updateDoctor).toHaveBeenCalledWith(1, expect.objectContaining({ telefono: '555' }));
  });
});

describe('DELETE /api/doctors/[id]', () => {
  it('borra doctor', async () => {
    vi.mocked(doctorsData.deleteDoctor).mockResolvedValue(undefined);
    const res = await DELETE_ID(makeRequest('http://test/api/doctors/1'), {
      params: Promise.resolve({ id: '1' }),
    });
    expect(res.status).toBe(200);
  });
});
