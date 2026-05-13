import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente público (anon key) — para uso en componentes client-side si fuera necesario.
 * Para las API routes del servidor, usar supabaseAdmin.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let supabaseAdminInstance: any = null;

/**
 * Cliente admin (service_role key) — SOLO para uso en API routes del servidor.
 * Bypasea Row Level Security. Nunca exponer en el cliente.
 */
export function getSupabaseAdmin() {
    if (supabaseAdminInstance) return supabaseAdminInstance;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'PENDIENTE') {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada. Agrégala en .env.local');
    }
    
    supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    
    return supabaseAdminInstance;
}
