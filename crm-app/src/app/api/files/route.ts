import { NextRequest, NextResponse } from 'next/server';
import { createFile } from '@/lib/data/files';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const pacienteId = formData.get('paciente_id');

        if (!file || !pacienteId) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
        }

        const db = getSupabaseAdmin();
        const fileBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // Nombre único para evitar colisiones en Storage
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `pacientes/${pacienteId}/${timestamp}_${safeFileName}`;

        // Intentar subir a Supabase Storage (bucket "archivos-crm")
        // Si el bucket no existe aún, se guarda solo el registro en BD con ruta vacía
        let rutaFinal = '';
        const { error: uploadError } = await db.storage
            .from('archivos-crm')
            .upload(storagePath, fileBytes, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
            });

        if (!uploadError) {
            const { data: urlData } = db.storage.from('archivos-crm').getPublicUrl(storagePath);
            rutaFinal = urlData?.publicUrl || storagePath;
        } else {
            // Si falla el storage (bucket no existe), guardamos igual el registro
            console.warn('Storage no disponible, guardando solo metadata:', uploadError.message);
            rutaFinal = storagePath; // guardamos la ruta planeada
        }

        const result = await createFile({
            paciente_id: Number(pacienteId),
            nombre_archivo: file.name,
            tipo_archivo: file.type || 'application/octet-stream',
            ruta_archivo: rutaFinal,
            tamano: file.size,
        });

        return NextResponse.json({ success: true, id: result.id, ruta: rutaFinal }, { status: 201 });
    } catch (err) {
        console.error('Error al subir archivo:', err);
        return NextResponse.json({ error: 'Error al procesar el archivo' }, { status: 500 });
    }
}
