import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, timingSafeEqual } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Validación de Origin contra Host. Equivale a un CSRF token "implícito":
 * un sitio externo no puede enviar un POST con Origin = nuestro host.
 *
 * Se permite que Origin esté ausente (algunas tools legítimas no lo mandan),
 * pero si viene, debe coincidir con Host. Bloqueamos cross-site explícito.
 */
function isAllowedOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    if (!origin) return true; // POST same-origin desde el form de Next no siempre manda Origin

    try {
        const originHost = new URL(origin).host;
        const targetHost = request.headers.get('host') || request.nextUrl.host;
        return originHost === targetHost;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    // CSRF: bloqueamos cross-origin antes de procesar credenciales.
    if (!isAllowedOrigin(request)) {
        return NextResponse.json({ ok: false, error: 'Origen no permitido' }, { status: 403 });
    }

    let body: { username?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'Cuerpo inválido' }, { status: 400 });
    }

    const { username, password } = body;
    if (!username || !password) {
        return NextResponse.json({ ok: false, error: 'Credenciales requeridas' }, { status: 400 });
    }

    const expectedUser = process.env.CRM_USER;
    const expectedPass = process.env.CRM_PASS;
    if (!expectedUser || !expectedPass) {
        return NextResponse.json(
            { ok: false, error: 'Servidor sin credenciales configuradas' },
            { status: 500 }
        );
    }

    const userOk = timingSafeEqual(username, expectedUser);
    const passOk = timingSafeEqual(password, expectedPass);
    if (!userOk || !passOk) {
        return NextResponse.json(
            { ok: false, error: 'Usuario o contraseña incorrectos' },
            { status: 401 }
        );
    }

    const token = await signSession(expectedUser);
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // 'strict' bloquea que la cookie viaje en navegaciones cross-site,
        // protección adicional contra ataques CSRF que aprovechen sesiones activas.
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
    });
    return res;
}
