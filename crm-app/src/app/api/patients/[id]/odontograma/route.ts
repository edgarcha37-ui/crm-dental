import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOdontograma, upsertOdontograma } from '@/lib/data/odontograma';
import { zodErrorResponse } from '@/schemas';

const TOOTH_ESTADOS = ['sano', 'caries', 'restauracion', 'extraccion', 'corona', 'implante', 'endodoncia', 'ausente'] as const;

const toothStateSchema = z.object({
  estado: z.enum(TOOTH_ESTADOS),
  notas: z.string().optional(),
  fecha: z.string().optional(),
});

const updateSchema = z.object({
  dientes: z.record(z.string(), toothStateSchema).optional(),
  observaciones: z.string().nullish(),
});

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pid = parseId(id);
    if (!pid) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    return NextResponse.json(await getOdontograma(pid));
  } catch (e) {
    console.error('GET odontograma:', e);
    return NextResponse.json({ error: 'Error al obtener odontograma' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pid = parseId(id);
    if (!pid) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    await upsertOdontograma(pid, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT odontograma:', e);
    return NextResponse.json({ error: 'Error al guardar odontograma' }, { status: 500 });
  }
}
