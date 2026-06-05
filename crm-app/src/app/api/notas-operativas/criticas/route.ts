import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        const db = getSupabaseAdmin();
        // Obtener la fecha de hace 24 horas
        const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Buscar notas de prioridad Alta, no completadas, creadas hace más de 24 horas
        const { data, error } = await db
            .from('notas_operativas')
            .select('*')
            .eq('prioridad', 'Alta')
            .eq('completada', false)
            .lt('fecha_creacion', hace24Horas)
            .order('fecha_creacion', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            count: data.length,
            notas: data
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
