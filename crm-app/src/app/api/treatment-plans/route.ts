import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { z } from 'zod';
import { getPlansByPatient, createPlan } from '@/lib/data/treatment-plans';
import { zodErrorResponse } from '@/schemas';

const createSchema = z.object({
  paciente_id: z.number().int().positive(),
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().nullish(),
  estado: z.enum(['Planeado', 'En Progreso', 'Completado', 'Cancelado', 'Suspendido']).default('En Progreso'),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_estimada_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pacienteId = Number(searchParams.get('paciente_id'));
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 });
  try {
    return NextResponse.json(await getPlansByPatient(pacienteId));
  } catch (e) {
    logApiError('GET /api/treatment-plans', e);
    return NextResponse.json({ error: 'Error al obtener planes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    const result = await createPlan(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    logApiError('POST /api/treatment-plans', e);
    return NextResponse.json({ error: 'Error al crear plan' }, { status: 500 });
  }
}
