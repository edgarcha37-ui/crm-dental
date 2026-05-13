import { NextRequest, NextResponse } from 'next/server';
import { createTreatment, updateTreatment } from '@/lib/data/treatments';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await createTreatment(body);
        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[treatments POST]', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const { id, ...data } = body;
    await updateTreatment(id, data);
    return NextResponse.json({ success: true });
}
