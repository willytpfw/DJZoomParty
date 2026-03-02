import { Router, Request, Response } from 'express';
import { db } from '../../db/db';
import { appRequest } from '../../db/schema';
import { handleError } from '../../utils/errorHandler';
import { sendEmail } from '../../utils/emailHelper';
import { sendPinToUser } from '../../utils/smsHelper';
import * as jose from 'jose';

const router = Router();

const API_URL = process.env.PRODUCTION == 'true' ? process.env.API_BASE_URL : process.env.URLLOCAL;
const SIGN_SECRET = process.env.SignJWS || 'default-secret-key-change-in-production';

/** Generates a random alphanumeric string of given length */
function generateKey(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * POST /v1/app/register
 * Registers an app request, stores it in AppRequest table,
 * and sends an activation email with a JWT link.
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { Company_Name, User, eMail, movil } = req.body;

        // Validate required fields
        if (!Company_Name || !User || !eMail) {
            return res.status(400).json({
                success: false,
                error: 'Company_Name, User and eMail are required',
            });
        }

        // Generate 10-character random private key
        const key = generateKey(10);

        // Generate 6-digit PIN and send via SMS
        const pin = await sendPinToUser(String(movil).substring(0, 10), String(User));

        // Get client IP
        const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const ip = (typeof rawIp === 'string' ? rawIp : String(rawIp)).substring(0, 45);

        // Save request to DB
        await db.insert(appRequest).values({
            companyName: String(Company_Name).substring(0, 100),
            userName: String(User).substring(0, 25),
            eMail: String(eMail).substring(0, 50),
            movil: String(movil).substring(0, 10),
            ip,
            key,
            active: false,
            pin,
        });

        // Create JWT signed with SignJWS, payload includes Key for later lookup
        const secret = new TextEncoder().encode(SIGN_SECRET);
        const token = await new jose.SignJWT({
            Key: key,
            Company_Name: String(Company_Name),
            User: String(User),
            eMail: String(eMail)
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('48h')
            .sign(secret);

        // Build activation URL pointing to frontend PIN validation form
        // Assumes frontend route for PIN validation is /validate-pin   
        const url_jwt = `${API_URL}/validate-pin?token=${token}`;

        // Send activation email
        await sendEmail(String(eMail), `Validar acceso a ${process.env.APP_NAME}`, url_jwt);

        return res.json({
            success: true,
            message: 'Registration request received. Please check your mobile for the verification PIN and your email for the activation link.',
            // Expose PIN in development for easier testing
            ...(process.env.NODE_ENV === 'development' && { pin }),
        });
    } catch (err) {
        const { message } = handleError(err);
        return res.status(500).json({ success: false, error: message });
    }
});

export default router;
