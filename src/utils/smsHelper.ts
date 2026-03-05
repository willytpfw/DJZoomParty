
import twilio from 'twilio';
import { sendEmail } from './emailHelper';

// Initialize Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send a PIN to a user via Twilio SMS or Email if SEND_SMS is false
 * @param movil User's mobile number (10 digits)
 * @param userName User's name for logging
 * @param email User's email to fallback to when SEND_SMS is false
 * @returns The generated PIN
 */
export async function sendPinToUser(movil: string, userName: string, email?: string): Promise<string> {
    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Send SMS via Twilio if is in production and SEND_SMS is true
    try {
        if (process.env.PRODUCTION === 'false') {
            console.log(`Development PIN:${pin}`);
            console.log(`eMail:${email}`);
            console.log(`SEND_SMS:${process.env.SEND_SMS}`);
            // Still send an email if SEND_SMS is false, even in development, to verify email flow
            if (process.env.SEND_SMS == 'false' && email) {
                console.log(`PIN sent via eMail:${pin}`);
                await sendEmail(email, `Validar acceso a ${process.env.APP_NAME}`, `Tu código de verificación para ${process.env.APP_NAME} es: ${pin}`);
            }
            return pin;
        }

        if (process.env.SEND_SMS == 'false') {
            if (email) {
                await sendEmail(email, `Validar acceso a ${process.env.APP_NAME}`, `Tu código de verificación para ${process.env.APP_NAME} es: ${pin}`);
                console.log(`PIN sent via Email to ${email}`);
            } else {
                console.error(`Attempted to send PIN via Email to ${userName} but no email was provided.`);
            }
        } else {
            await twilioClient.messages.create({
                body: `Tu código de verificación para ${process.env.APP_NAME} es: ${pin}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+52${movil}`, // Assuming Mexico phone numbers
            });
            console.log(`SMS sent to +52${movil}`);
        }
    } catch (error) {
        console.error('Error sending PIN (Twilio/Email):', error);
        // For dev/fallback, log the PIN so we can still test
        console.log(`PIN for ${userName}: ${pin}`);
    }

    return pin;
}
