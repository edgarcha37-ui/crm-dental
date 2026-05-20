import { NextRequest, NextResponse } from 'next/server';
import { getPatients, createPatient, getPatientById, searchPatients, getPatientStats } from '@/lib/data/patients';
import { triggerN8n } from '@/lib/n8n';
import { createPatientSchema, zodErrorResponse } from '@/schemas';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const stats = searchParams.get('stats');
    const filter = searchParams.get('filter') as 'activos' | 'archivados' | null;

    try {
        if (stats === 'true') return NextResponse.json(await getPatientStats());
        if (query) return NextResponse.json(await searchPatients(query));
        return NextResponse.json(await getPatients(filter || undefined));
    } catch (err) {
        console.error('GET /api/patients:', err);
        return NextResponse.json({ error: 'Error al obtener pacientes' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = createPatientSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
        }

        const result = await createPatient(parsed.data);

        // Dispara workflow de bienvenida en n8n (no-bloqueante: si falla no rompe el alta).
        const created = await getPatientById(result.id);
        if (created) {
            triggerN8n('bienvenida-paciente', {
                id: created.id,
                nombre: created.nombre,
                telefono: created.telefono,
                correo: created.correo,
                fuente_captacion: created.fuente_captacion,
            }).catch(() => { /* ya loggeado dentro del helper */ });
        }

        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error('POST /api/patients:', err);
        return NextResponse.json({ error: 'Error al crear paciente' }, { status: 500 });
    }
}
