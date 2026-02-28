/**
 * Email helper — sends email via the external Email API
 */

const EMAIL_API_URL = process.env.EMAIL_API_URL || '';
const EMAIL_API_PASSWORD = process.env.EMAIL_API_PASSWORD || '';

export async function sendEmail(
    destinatario: string,
    asunto: string,
    mensaje: string
): Promise<void> {
    const payload = {
        destinatario,
        asunto,
        mensaje,
        password: EMAIL_API_PASSWORD,
    };

    const response = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Email API error (${response.status}): ${text}`);
    }
}
