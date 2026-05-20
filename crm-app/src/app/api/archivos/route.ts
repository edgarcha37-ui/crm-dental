import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPresignedUploadUrl, createArchivoRecord, getArchivosByPaciente, deleteArchivo } from '@/lib/data/archivos';
import { zodErrorResponse } from '@/schemas';

const presignedSchema = z.object({
  paciente_id: z.number().int().positive(),
  nombre_archivo: z.string().trim().min(1),
  tipo_archivo: z.string().optional(),
  peso_archivo: z.number().nonnegative().optional(),
  categoria: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pacienteId = Number(searchParams.get('paciente_id'));
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 });
  try {
    const archivos = await getArchivosByPaciente(pacienteId);
    return NextResponse.json(archivos);
  } catch (err) {
    console.error('GET /api/archivos:', err);
    return NextResponse.json({ error: 'Error al obtener archivos' }, { status: 500 });
  }
}

// POST /api/archivos — devuelve presigned URL para subir directo a Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = presignedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
    }
    const { paciente_id, nombre_archivo, tipo_archivo, peso_archivo, categoria } = parsed.data;

    const presigned = await getPresignedUploadUrl(paciente_id, nombre_archivo, tipo_archivo || 'application/octet-stream');

    const archivo = await createArchivoRecord({
      paciente_id,
      nombre_archivo,
      url_publica: presigned.publicUrl,
      storage_path: presigned.path,
      tipo_archivo: tipo_archivo || 'application/octet-stream',
      peso_archivo: peso_archivo || 0,
      categoria: categoria || 'General',
    });

    return NextResponse.json({ archivo, signedUrl: presigned.signedUrl, token: presigned.token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('POST /api/archivos:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await deleteArchivo(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/archivos:', err);
    return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 });
  }
}
