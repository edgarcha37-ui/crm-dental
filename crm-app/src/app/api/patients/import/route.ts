import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPatient } from '@/lib/data/patients';
import { zodErrorResponse } from '@/schemas';

const rowSchema = z.object({
  nombre: z.string().trim().min(1),
  telefono: z.string().trim().optional().nullable(),
  correo: z.string().trim().optional().nullable(),
  direccion: z.string().trim().optional().nullable(),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sexo: z.string().trim().optional().nullable(),
  fuente_captacion: z.string().trim().optional().nullable(),
  notas_generales: z.string().trim().optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

interface ImportResult {
  total: number;
  created: number;
  errors: { row: number; nombre?: string; message: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });

    const result: ImportResult = { total: parsed.data.rows.length, created: 0, errors: [] };
    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i];
      try {
        // Limpieza: vacíos a null para que la BD no guarde "" como teléfono.
        await createPatient({
          nombre: row.nombre,
          telefono: row.telefono || null,
          correo: row.correo || null,
          direccion: row.direccion || null,
          fecha_nacimiento: row.fecha_nacimiento || null,
          sexo: row.sexo || null,
          fuente_captacion: row.fuente_captacion || 'CSV',
          notas_generales: row.notas_generales || null,
        });
        result.created++;
      } catch (e) {
        result.errors.push({
          row: i + 1,
          nombre: row.nombre,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('POST /api/patients/import:', e);
    return NextResponse.json({ error: 'Error al procesar import' }, { status: 500 });
  }
}
