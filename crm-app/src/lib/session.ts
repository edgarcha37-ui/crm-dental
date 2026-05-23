/**
 * Sesiones firmadas con HMAC-SHA256 usando Web Crypto.
 * Compatible con Edge runtime (middleware) y Node (route handlers).
 *
 * Token = base64url(payload) + "." + base64url(sig)
 *   payload = {"u":"<usuario>","exp":<unix-segundos>}
 *   sig     = HMAC_SHA256(SESSION_SECRET, base64url(payload))
 */

export const SESSION_COOKIE = 'crm_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

import type { Role } from './permissions';

type SessionPayload = { u: string; exp: number; r?: Role };

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array | ArrayBuffer): string {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let str = '';
    for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const base64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

function getSecret(): string {
    const s = process.env.SESSION_SECRET;
    if (!s) throw new Error('SESSION_SECRET no configurada');
    return s;
}

export async function signSession(user: string, role: Role = 'admin', ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
    const payload: SessionPayload = { u: user, r: role, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
    const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
    const key = await importKey(getSecret());
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
    return `${payloadB64}.${b64urlEncode(sig)}`;
}

/**
 * Verifica firma + expiración. Devuelve el payload o null.
 * Re-firma el payload y compara con timing-safe equal — evita los problemas
 * de tipos de ArrayBuffer entre Node y Edge runtime al pasar a crypto.subtle.verify.
 */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    try {
        const key = await importKey(getSecret());
        const expectedSig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
        const expectedB64 = b64urlEncode(expectedSig);
        if (!timingSafeEqual(sigB64, expectedB64)) return null;
        const payload = JSON.parse(dec.decode(b64urlDecode(payloadB64))) as SessionPayload;
        if (!payload?.u || !payload?.exp) return null;
        if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

/**
 * Comparación constant-time de strings. Útil para comparar contraseña.
 */
export function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}
