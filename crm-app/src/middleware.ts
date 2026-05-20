import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

/**
 * Protege todas las rutas del CRM exigiendo cookie de sesión válida.
 *
 * Excepciones (públicas):
 *  - /login y assets de Next
 *  - /api/auth/* (login/logout)
 *  - Llamadas internas que traen x-internal-key === INTERNAL_API_KEY
 *    (n8n consume APIs del CRM con este header)
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir login y assets sin sesión (estos no entran al middleware por el
    // matcher, pero dejamos la guarda explícita por si el matcher cambia).
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Bypass para integraciones internas (n8n → CRM)
    const internalKey = process.env.INTERNAL_API_KEY;
    if (internalKey && request.headers.get('x-internal-key') === internalKey) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (session) return NextResponse.next();

    // Sin sesión válida
    if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    /**
     * Lista plana de rutas protegidas. La lógica de excepciones (/login,
     * /api/auth/*, x-internal-key) vive dentro de la función middleware.
     * Evitamos negative-lookaheads porque en Next 16 el matcher los aplica
     * de forma inconsistente y bloqueaba POST /api/auth/login en runtime.
     */
    matcher: [
        '/',
        '/patients/:path*',
        '/appointments/:path*',
        '/billing/:path*',
        '/metrics/:path*',
        '/notes/:path*',
        '/settings/:path*',
        '/api/:path*',
    ],
};
