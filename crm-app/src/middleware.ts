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

    // Debug diagnostics — solo presencia, no valores
    const dbgSecret = process.env.SESSION_SECRET ? `${process.env.SESSION_SECRET.length}` : 'missing';
    const dbgInternal = process.env.INTERNAL_API_KEY ? `${process.env.INTERNAL_API_KEY.length}` : 'missing';

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);

    if (session) {
        const res = NextResponse.next();
        res.headers.set('x-mw-secret-len', dbgSecret);
        res.headers.set('x-mw-internal-len', dbgInternal);
        return res;
    }

    // Sin sesión válida
    if (pathname.startsWith('/api/')) {
        const res = NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        res.headers.set('x-mw-secret-len', dbgSecret);
        res.headers.set('x-mw-internal-len', dbgInternal);
        res.headers.set('x-mw-had-cookie', token ? 'yes' : 'no');
        return res;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('x-mw-secret-len', dbgSecret);
    res.headers.set('x-mw-internal-len', dbgInternal);
    res.headers.set('x-mw-had-cookie', token ? 'yes' : 'no');
    return res;
}

/**
 * Forzamos runtime Node.js (no Edge) para que process.env.SESSION_SECRET y
 * INTERNAL_API_KEY se lean de la misma forma que en las API routes, evitando
 * desincronización de env entre runtimes dentro del mismo contenedor.
 */
export const config = {
    runtime: 'nodejs',
    /**
     * Aplica a todo, excepto:
     *  - /login, /api/auth/*  (siempre públicos)
     *  - /_next/*, /favicon.ico, /robots.txt
     *  - archivos con extensión (.png, .ico, .svg, .css, .js, ...)
     */
    matcher: [
        '/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.[\\w]+$).*)',
    ],
};
