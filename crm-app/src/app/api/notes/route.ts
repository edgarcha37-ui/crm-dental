import { NextRequest, NextResponse } from 'next/server';
import { getNotes, getNotesByPatient, createNote, updateNote, deleteNote, toggleNoteComplete } from '@/lib/data/notes';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('paciente_id');
    if (pacienteId) return NextResponse.json(await getNotesByPatient(Number(pacienteId)));
    return NextResponse.json(await getNotes());
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const result = await createNote(body);
    return NextResponse.json(result, { status: 201 });
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const { id, toggle, ...data } = body;
    if (toggle) { await toggleNoteComplete(id); return NextResponse.json({ success: true }); }
    await updateNote(id, data);
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await deleteNote(Number(id));
    return NextResponse.json({ success: true });
}
