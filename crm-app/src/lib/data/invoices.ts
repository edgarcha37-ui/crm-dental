import { getSupabaseAdmin } from '../supabase';

export interface Invoice {
    id: number;
    paciente_id: number | null;
    tratamiento_id: number | null;
    razon_social: string | null;
    rfc: string | null;
    direccion_fiscal: string | null;
    uso_cfdi: string | null;
    monto: number;
    fecha: string;
    numero_factura: string | null;
    concepto: string | null;
    tipo: 'factura' | 'abono' | 'servicio';
    estatus: string;
    created_at: string;
    paciente_nombre?: string;
    tratamiento_nombre?: string;
}

export async function getInvoices(filter?: 'Pagada' | 'Pendiente') {
    const db = getSupabaseAdmin();
    let query = db.from('invoices').select('*, patients(nombre), treatments(nombre_tratamiento)');
    if (filter) query = query.eq('estatus', filter);
    const { data, error } = await query.order('fecha', { ascending: false });
    if (error) throw error;
    return ((data || []) as unknown[]).map((i) => {
        const row = i as { patients?: { nombre: string }; treatments?: { nombre_tratamiento: string };[key: string]: unknown };
        return {
            ...row,
            paciente_nombre: row.patients?.nombre,
            tratamiento_nombre: row.treatments?.nombre_tratamiento,
        } as Invoice;
    });
}

export async function getInvoicesByPatient(pacienteId: number) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('invoices')
        .select('*, patients(nombre), treatments(nombre_tratamiento)')
        .eq('paciente_id', pacienteId)
        .order('fecha', { ascending: false });
    if (error) throw error;
    return ((data || []) as unknown[]).map((i) => {
        const row = i as { patients?: { nombre: string }; treatments?: { nombre_tratamiento: string };[key: string]: unknown };
        return {
            ...row,
            paciente_nombre: row.patients?.nombre,
            tratamiento_nombre: row.treatments?.nombre_tratamiento,
        } as Invoice;
    });
}

export async function createInvoice(data: Partial<Invoice>) {
    const db = getSupabaseAdmin();
    const { data: result, error } = await db.from('invoices').insert({
        paciente_id: data.paciente_id,
        tratamiento_id: data.tratamiento_id || null,
        razon_social: data.razon_social || null,
        rfc: data.rfc || null,
        direccion_fiscal: data.direccion_fiscal || null,
        uso_cfdi: data.uso_cfdi || null,
        monto: data.monto,
        fecha: data.fecha || new Date().toISOString().split('T')[0],
        numero_factura: data.numero_factura || null,
        concepto: data.concepto || null,
        tipo: data.tipo || 'factura',
        estatus: data.estatus || 'Pendiente',
    }).select().single();
    if (error) throw error;
    return { id: result.id };
}

export async function getInvoiceStats() {
    const db = getSupabaseAdmin();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [incomeRes, pendingRes, countRes] = await Promise.all([
        db.from('invoices').select('monto').eq('estatus', 'Pagada').gte('fecha', firstOfMonth),
        db.from('invoices').select('monto').eq('estatus', 'Pendiente'),
        db.from('invoices').select('id', { count: 'exact', head: true }),
    ]);

    const monthlyIncome = (incomeRes.data || []).reduce((acc: number, i: { monto: number }) => acc + (i.monto || 0), 0);
    const pendingPayments = (pendingRes.data || []).reduce((acc: number, i: { monto: number }) => acc + (i.monto || 0), 0);

    return {
        monthlyIncome,
        pendingPayments,
        totalInvoices: countRes.count ?? 0,
    };
}
