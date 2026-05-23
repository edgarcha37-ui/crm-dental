import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { updateTreatment } from '@/lib/data/treatments';
import { updateTreatmentSchema, zodErrorResponse } from '@/schemas';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const treatmentId = Number(id);
        if (!Number.isInteger(treatmentId) || treatmentId <= 0) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }
        const body = await request.json();
        const parsed = updateTreatmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        await updateTreatment(treatmentId, parsed.data);
        return NextResponse.json({ success: true });
    } catch (err) {
        logApiError('PUT /api/treatments/[id]', err);
        return NextResponse.json({ error: 'Error al actualizar tratamiento' }, { status: 500 });
    }
}
