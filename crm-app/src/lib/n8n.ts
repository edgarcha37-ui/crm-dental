/**
 * Cliente para invocar workflows de n8n desde las API routes del CRM.
 *
 * Dispara webhooks por path (ej. "bienvenida-paciente") usando N8N_WEBHOOK_BASE.
 * Para llamadas a la API administrativa de n8n (listar/crear workflows) usa N8N_API_KEY.
 *
 * Los workflows en n8n deben validar el header `x-crm-secret` contra
 * N8N_WEBHOOK_SECRET para evitar invocaciones externas no autorizadas.
 */

const BASE = process.env.N8N_WEBHOOK_BASE ?? '';
const SECRET = process.env.N8N_WEBHOOK_SECRET ?? '';
const API_BASE = process.env.N8N_BASE_URL ?? '';
const API_KEY = process.env.N8N_API_KEY ?? '';

export type N8nTriggerResult = {
    ok: boolean;
    status: number;
    data?: unknown;
    error?: string;
};

/**
 * Dispara un workflow de n8n por su webhook path.
 * No lanza excepción: si falla, devuelve { ok: false } y loggea el error.
 * Esto evita que un fallo de automatización rompa la operación principal del CRM.
 */
export async function triggerN8n(
    path: string,
    payload: Record<string, unknown>,
    opts: { timeoutMs?: number; test?: boolean } = {}
): Promise<N8nTriggerResult> {
    if (!BASE) {
        return { ok: false, status: 0, error: 'N8N_WEBHOOK_BASE no configurada' };
    }

    const base = opts.test ? BASE.replace('/webhook', '/webhook-test') : BASE;
    const url = `${base}/${path.replace(/^\//, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-crm-secret': SECRET,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        const text = await res.text();
        let data: unknown = text;
        try { data = JSON.parse(text); } catch { /* respuesta no-JSON */ }

        if (!res.ok) {
            console.error(`[n8n] ${path} → ${res.status}`, data);
            return { ok: false, status: res.status, data };
        }
        return { ok: true, status: res.status, data };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[n8n] ${path} fetch error:`, msg);
        return { ok: false, status: 0, error: msg };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Llama a la API administrativa de n8n (no a un webhook).
 * Útil para listar workflows, activarlos, leer ejecuciones, etc.
 */
export async function n8nApi<T = unknown>(
    apiPath: string,
    init: RequestInit = {}
): Promise<T> {
    if (!API_BASE || !API_KEY) {
        throw new Error('N8N_BASE_URL o N8N_API_KEY no configuradas');
    }
    const res = await fetch(`${API_BASE}/api/v1${apiPath}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': API_KEY,
            ...(init.headers ?? {}),
        },
    });
    if (!res.ok) {
        throw new Error(`n8n API ${apiPath} → ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<T>;
}
