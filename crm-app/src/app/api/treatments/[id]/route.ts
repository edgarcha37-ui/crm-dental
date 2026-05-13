import { NextRequest, NextResponse } from 'next/server';
import { updateTreatment } from '@/lib/data/treatments';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    await updateTreatment(Number(id), body);
    return NextResponse.json({ success: true });
}
