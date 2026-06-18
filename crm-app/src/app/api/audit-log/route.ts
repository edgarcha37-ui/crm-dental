import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logApiError } from '@/lib/logger';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const actor = searchParams.get('actor');
    const action = searchParams.get('action');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const offset = Number(searchParams.get('offset')) || 0;

    try {
        const db = getSupabaseAdmin();
        let query = db.from('audit_log').select('*', { count: 'exact' });

        if (entity) query = query.eq('entity', entity);
        if (actor) query = query.eq('actor', actor);
        if (action) query = query.eq('action', action);

        query = query.order('ts', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return NextResponse.json({ data: data || [], total: count ?? 0 });
    } catch (err) {
        logApiError('GET /api/audit-log', err);
        return NextResponse.json({ error: 'Error al obtener audit log' }, { status: 500 });
    }
}
