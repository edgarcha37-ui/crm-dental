import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, timingSafeEqual } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
    });
    return res;
}
