
import twilio from 'twilio';

// Initialize Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send a PIN to a user via Twilio SMS
 * @param movil User's mobile number (10 digits)
 * @param userName User's name for logging
 * @returns The generated PIN
 */
export async function sendPinToUser(movil: string, userName: string): Promise<string> {
    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Send SMS via Twilio
    try {
        await twilioClient.messages.create({
            body: `Tu código de verificación AppEvents es: ${pin}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+52${movil}`, // Assuming Mexico phone numbers
        });
        console.log(`SMS sent to +52${movil}`);
    } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        // For dev/fallback, log the PIN so we can still test
        console.log(`PIN for ${userName}: ${pin}`);
    }

    return pin;
}
