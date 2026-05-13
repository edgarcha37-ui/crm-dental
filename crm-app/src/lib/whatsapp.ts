/**
 * Wrapper de envío WhatsApp. Mientras WHATSAPP_PROVIDER=placeholder,
 * solo loggea el mensaje. Cuando se obtenga el Token permanente de Meta,
 * basta cambiar WHATSAPP_PROVIDER=meta y rellenar PHONE_NUMBER_ID + ACCESS_TOKEN.
 */

const PROVIDER = process.env.WHATSAPP_PROVIDER ?? 'placeholder';
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
const VERSION = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

export type WhatsAppResult = { ok: boolean; provider: string; data?: unknown; error?: string };

export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppResult> {
    if (PROVIDER === 'placeholder' || !PHONE_ID || !TOKEN || TOKEN === 'PENDIENTE') {
        console.log(`[whatsapp:placeholder] → ${to}: ${body}`);
        return { ok: true, provider: 'placeholder', data: { to, body } };
    }

    if (PROVIDER === 'meta') {
        try {
            const res = await fetch(
                `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${TOKEN}`,
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to,
                        type: 'text',
                        text: { body },
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) return { ok: false, provider: 'meta', error: JSON.stringify(data) };
            return { ok: true, provider: 'meta', data };
        } catch (err) {
            return { ok: false, provider: 'meta', error: err instanceof Error ? err.message : String(err) };
        }
    }

    return { ok: false, provider: PROVIDER, error: `Provider no soportado: ${PROVIDER}` };
}
