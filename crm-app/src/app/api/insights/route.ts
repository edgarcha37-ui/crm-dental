import { NextRequest, NextResponse } from 'next/server';
import { getInsights, insertInsight, markInsightSeen } from '@/lib/data/insights';

export async function GET() {
    try {
        const insights = await getInsights();
        return NextResponse.json(insights);
    } catch (err) {
        console.error('GET /api/insights error:', err);
        return NextResponse.json({ error: 'Error al obtener insights' }, { status: 500 });
    }
}

/**
 * POST /api/insights — Para uso por n8n.
 * Body: { categoria, titulo, contenido, accion_sugerida? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { categoria, titulo, contenido, accion_sugerida } = body;

        if (!categoria || !titulo || !contenido) {
            return NextResponse.json(
                { error: 'categoria, titulo y contenido son requeridos' },
                { status: 400 }
            );
        }

        const validCategorias = ['Marketing', 'Operaciones', 'Retención'];
        if (!validCategorias.includes(categoria)) {
            return NextResponse.json(
                { error: `categoria debe ser uno de: ${validCategorias.join(', ')}` },
                { status: 400 }
            );
        }

        const result = await insertInsight({
            categoria,
            titulo,
            contenido,
            accion_sugerida: accion_sugerida || null,
            visto: false,
            fecha: new Date().toISOString(),
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error('POST /api/insights error:', err);
        return NextResponse.json({ error: 'Error al insertar insight' }, { status: 500 });
    }
}

/**
 * PATCH /api/insights — Marcar insight como visto.
 * Body: { id: number }
 */
export async function PATCH(request: NextRequest) {
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
        await markInsightSeen(Number(id));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('PATCH /api/insights error:', err);
        return NextResponse.json({ error: 'Error al actualizar insight' }, { status: 500 });
    }
}
