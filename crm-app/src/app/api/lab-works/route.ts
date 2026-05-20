import { NextRequest, NextResponse } from 'next/server';
import { getLabWorks, getActiveLabWorks, createLabWork } from '@/lib/data/lab-works';
import { createLabWorkSchema, zodErrorResponse } from '@/schemas';
import { LabWorkEstado } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');
  const estado = searchParams.get('estado') as LabWorkEstado | null;
  try {
    if (active === 'true') {
      const limit = Number(searchParams.get('limit')) || 5;
      return NextResponse.json(await getActiveLabWorks(limit));
    }
    return NextResponse.json(await getLabWorks(estado || undefined));
  } catch (e) {
    console.error('GET /api/lab-works:', e);
    return NextResponse.json({ error: 'Error al obtener trabajos de laboratorio' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createLabWorkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    const result = await createLabWork(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST /api/lab-works:', e);
    return NextResponse.json({ error: 'Error al crear trabajo' }, { status: 500 });
  }
}
