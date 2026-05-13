import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl, createArchivoRecord, getArchivosByPaciente, deleteArchivo } from '@/lib/data/archivos';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pacienteId = Number(searchParams.get('paciente_id'));
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 });
  try {
    const archivos = await getArchivosByPaciente(pacienteId);
    return NextResponse.json(archivos);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/archivos — obtener presigned URL para subir directamente a Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paciente_id, nombre_archivo, tipo_archivo, peso_archivo, categoria } = body;

    if (!paciente_id || !nombre_archivo) {
      return NextResponse.json({ error: 'paciente_id y nombre_archivo requeridos' }, { status: 400 });
    }

    const presigned = await getPresignedUploadUrl(Number(paciente_id), nombre_archivo, tipo_archivo || 'application/octet-stream');

    // Guardar registro en BD (url_publica ya disponible, el archivo subirá con presigned URL)
    const archivo = await createArchivoRecord({
      paciente_id: Number(paciente_id),
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
    console.error('[archivos POST]', msg);
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
