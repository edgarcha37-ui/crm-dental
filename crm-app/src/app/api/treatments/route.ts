import { NextRequest, NextResponse } from 'next/server';
import { createTreatment } from '@/lib/data/treatments';
import { createTreatmentSchema, zodErrorResponse } from '@/schemas';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createTreatmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const result = await createTreatment(parsed.data);
        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('POST /api/treatments:', msg);
        return NextResponse.json({ error: 'Error al crear tratamiento' }, { status: 500 });
    }
}
