import { NextRequest, NextResponse } from 'next/server';
import { getNotes, getNotesByPatient, createNote, updateNote, deleteNote, toggleNoteComplete } from '@/lib/data/notes';
import { createNoteSchema, zodErrorResponse } from '@/schemas';
import { z } from 'zod';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('paciente_id');
    try {
        if (pacienteId) return NextResponse.json(await getNotesByPatient(Number(pacienteId)));
        return NextResponse.json(await getNotes());
    } catch (err) {
        console.error('GET /api/notes:', err);
        return NextResponse.json({ error: 'Error al obtener notas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createNoteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const result = await createNote(parsed.data);
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error('POST /api/notes:', err);
        return NextResponse.json({ error: 'Error al crear nota' }, { status: 500 });
    }
}

const updateNoteBodySchema = z.object({
    id: z.number().int().positive(),
    toggle: z.boolean().optional(),
}).passthrough();

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = updateNoteBodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }
        const { id, toggle, ...data } = parsed.data;
        if (toggle) { await toggleNoteComplete(id); return NextResponse.json({ success: true }); }
        await updateNote(id, data);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('PUT /api/notes:', err);
        return NextResponse.json({ error: 'Error al actualizar nota' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    try {
        await deleteNote(Number(id));
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/notes:', err);
        return NextResponse.json({ error: 'Error al eliminar nota' }, { status: 500 });
    }
}
