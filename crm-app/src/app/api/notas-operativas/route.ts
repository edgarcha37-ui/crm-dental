import { NextRequest, NextResponse } from 'next/server';
import { getNotasOperativas, createNotaOperativa, updateNotaOperativa, deleteNotaOperativa } from '@/lib/data/notas_operativas';
import { createNotaOperativaSchema, updateNotaOperativaSchema, zodErrorResponse } from '@/schemas';

export async function GET() {
    try {
        const notes = await getNotasOperativas();
        return NextResponse.json(notes);
    } catch (err) {
        console.error('GET /api/notas-operativas:', err);
        return NextResponse.json({ error: 'Error al obtener notas operativas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createNotaOperativaSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const note = await createNotaOperativa(parsed.data);
        return NextResponse.json(note, { status: 201 });
    } catch (err) {
        console.error('POST /api/notas-operativas:', err);
        return NextResponse.json({ error: 'Error al crear nota operativa' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = updateNotaOperativaSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const { id, ...data } = parsed.data;
        await updateNotaOperativa(id, data);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('PUT /api/notas-operativas:', err);
        return NextResponse.json({ error: 'Error al actualizar nota operativa' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    try {
        await deleteNotaOperativa(Number(id));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/notas-operativas:', err);
        return NextResponse.json({ error: 'Error al eliminar nota operativa' }, { status: 500 });
    }
}
