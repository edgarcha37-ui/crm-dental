import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updatePlan, deletePlan } from '@/lib/data/treatment-plans';
import { zodErrorResponse } from '@/schemas';

const updateSchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().nullish(),
  estado: z.enum(['Planeado', 'En Progreso', 'Completado', 'Cancelado', 'Suspendido']).optional(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_estimada_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pid = parseId(id);
    if (!pid) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    await updatePlan(pid, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/treatment-plans/[id]:', e);
    return NextResponse.json({ error: 'Error al actualizar plan' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const pid = parseId(id);
    if (!pid) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    await deletePlan(pid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/treatment-plans/[id]:', e);
    return NextResponse.json({ error: 'Error al eliminar plan' }, { status: 500 });
  }
}
