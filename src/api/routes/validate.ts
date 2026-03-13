import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/db';
import { appRequest, company, user, userCompany, userLogin } from '../../db/schema';
import { handleError } from '../../utils/errorHandler';
import { sendEmail } from '../../utils/emailHelper';
import { getCurrentDateUTC6 } from '../../utils/timezone';
import * as jose from 'jose';
import { addMonths } from 'date-fns/fp';

const router = Router();

const API_URL = process.env.PRODUCTION == 'true' ? process.env.API_BASE_URL : process.env.URLLOCAL;
const SIGN_SECRET = process.env.SignJWS || 'default-secret-key-change-in-production';

/** Generates a random 8-digit numeric string */
function generateKeyCompany(): string {
    return String(Math.floor(10000000 + Math.random() * 90000000));
}

/** Generates a random alphanumeric string of given length */
function generateRandomStr(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * POST /v1/auth/validate  (also accepts GET with ?token=... so email links work)
 * Validates the JWT sent in the activation email, activates the AppRequest,
 * creates Company / User / UserCompany records, and sends a final email with credentials.
 */

async function handleValidate(req: Request, res: Response) {
    try {
        // Accept token from body or query string
        const token = (req.body?.token as string) || (req.query?.token as string);

        if (!token) {
            return res.status(400).json({ success: false, error: 'token is required' });
        }

        // Verify JWT with SignJWS
        const secret = new TextEncoder().encode(SIGN_SECRET);
        let payload: jose.JWTPayload;
        try {
            const result = await jose.jwtVerify(token, secret);
            payload = result.payload;
        } catch {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        const key = payload['Key'] as string;
        const companyName = payload['Company_Name'] as string;
        const userName = payload['User'] as string;
        const eMail = payload['eMail'] as string;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Token payload missing Key field' });
        }

        // Look up AppRequest by Key, must be inactive
        const existingRequest = await db.query.appRequest.findFirst({
            where: and(
                eq(appRequest.key, key),
                eq(appRequest.active, false)
            ),
        });

        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                error: 'Registration request not found or already activated',
            });
        }

        // Activate the AppRequest
        await db.update(appRequest)
            .set({ active: true })
            .where(eq(appRequest.idAppRequest, existingRequest.idAppRequest));

        // Generate unique 8-digit key_company (retry if collision)
        let keyCompany = '';
        let attempts = 0;
        while (attempts < 5) {
            const candidate = generateKeyCompany();
            const existing = await db.query.company.findFirst({
                where: eq(company.keyCompany, candidate),
            });
            if (!existing) {
                keyCompany = candidate;
                break;
            }
            attempts++;
        }
        if (!keyCompany) {
            return res.status(500).json({ success: false, error: 'Could not generate unique company key, try again' });
        }

        // Insert Company
        const [newCompany] = await db.insert(company).values({
            name: companyName,
            keyCompany,
            active: true,
            url: API_URL
        }).returning();

        // Generate temporary password for the user (12-char random)
        const tempPassword = generateRandomStr(12);

        // Insert User (administrator by default)
        const [newUser] = await db.insert(user).values({
            userName,
            eMail,
            movil: existingRequest.movil ?? undefined,
            administrator: false,
            active: true,
            password: tempPassword.substring(0, 16),
        }).returning();

        // Link User → Company
        await db.insert(userCompany).values({
            idUser: newUser.idUser,
            idCompany: newCompany.idCompany,
        });

        // Insert UserLogin to mark the user as successfully authenticated
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        await db.insert(userLogin).values({
            idUser: newUser.idUser,
            pin: '000000',
            ip: typeof ip === 'string' ? ip.substring(0, 45) : String(ip).substring(0, 45),
            response: '200',
            date: getCurrentDateUTC6(),
        });

        // Create final JWT signed with SignJWS
        const finalSecret = new TextEncoder().encode(SIGN_SECRET);
        const finalToken = await new jose.SignJWT({
            KeyCompany: keyCompany,
            UserName: userName,
            PIN: '000000'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(finalSecret);

        // Build final URL
        const AccessText = 'Da clic en la siguiente dirección para acceder a la aplicacion. \n\n';
        const finalUrl = `${API_URL}?token=${finalToken}`;

        // Send final email with JWT URL
        await sendEmail(eMail, `Acceso a ${process.env.APP_NAME}`, AccessText + finalUrl);

        return res.json({
            success: true,
            message: 'Account activated successfully. Check your email for access credentials.',
            KeyCompany: keyCompany,
            UserName: userName,
        });
    } catch (err) {
        const { message } = handleError(err);
        return res.status(500).json({ success: false, error: message });
    }
}

// Support both GET (email link click) and POST (programmatic call)
router.get('/validate', handleValidate);

/**
 * POST /v1/auth/validate-pin
 * New flow: Validates the JWT + PIN, activates AppRequest, creates Company/User
 */
async function handleValidatePin(req: Request, res: Response) {
    try {
        const { token, pin } = req.body;

        if (!token || !pin) {
            return res.status(400).json({ success: false, error: 'token and pin are required' });
        }

        // Verify JWT with SignJWS
        const secret = new TextEncoder().encode(SIGN_SECRET);
        let payload: jose.JWTPayload;
        try {
            const result = await jose.jwtVerify(token, secret);
            payload = result.payload;
        } catch {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        const key = payload['Key'] as string;
        const companyName = payload['Company_Name'] as string;
        const userName = payload['User'] as string;
        const eMail = payload['eMail'] as string;

        if (!key) {
            return res.status(400).json({ success: false, error: 'Token payload missing Key field' });
        }

        // Look up AppRequest by Key, must be inactive
        const existingRequest = await db.query.appRequest.findFirst({
            where: and(
                eq(appRequest.key, key),
                eq(appRequest.active, false)
            ),
        });

        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                error: 'Registration request not found or already activated',
            });
        }

        // Validate PIN
        if (existingRequest.pin !== String(pin)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid PIN. Please try again.',
            });
        }

        // Activate the AppRequest
        await db.update(appRequest)
            .set({ active: true })
            .where(eq(appRequest.idAppRequest, existingRequest.idAppRequest));

        // Generate unique 8-digit key_company (retry if collision)
        let keyCompany = '';
        let attempts = 0;
        while (attempts < 5) {
            const candidate = generateKeyCompany();
            const existing = await db.query.company.findFirst({
                where: eq(company.keyCompany, candidate),
            });
            if (!existing) {
                keyCompany = candidate;
                break;
            }
            attempts++;
        }
        if (!keyCompany) {
            return res.status(500).json({ success: false, error: 'Could not generate unique company key, try again' });
        }

        // Insert Company
        const [newCompany] = await db.insert(company).values({
            name: companyName,
            keyCompany,
            active: true,
            url: API_URL
        }).returning();

        // Generate temporary password for the user (12-char random)
        const tempPassword = generateRandomStr(12);

        // Insert User (administrator by default)
        const [newUser] = await db.insert(user).values({
            userName,
            eMail,
            movil: existingRequest.movil ?? undefined,
            administrator: false,
            active: true,
            password: tempPassword.substring(0, 16),
        }).returning();

        // Link User → Company
        await db.insert(userCompany).values({
            idUser: newUser.idUser,
            idCompany: newCompany.idCompany,
        });

        // Insert UserLogin to mark the user as successfully authenticated
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        await db.insert(userLogin).values({
            idUser: newUser.idUser,
            pin: String(pin),
            ip: typeof ip === 'string' ? ip.substring(0, 45) : String(ip).substring(0, 45),
            response: '200',
            date: addMonths(1, Number(getCurrentDateUTC6()))
        });

        // Create final JWT signed with SignJWS
        const finalSecret = new TextEncoder().encode(SIGN_SECRET);
        const finalToken = await new jose.SignJWT({
            KeyCompany: keyCompany,
            UserName: userName,
            PIN: '000000'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1y')
            .sign(finalSecret);

        const AccessText = 'Da clic en la siguiente dirección para acceder a la aplicacion. \n\n';
        // Build final URL
        const finalUrl = `${API_URL}?token=${finalToken}`;

        // Send final email with JWT URL
        await sendEmail(eMail, `Acceso a ${process.env.APP_NAME}`, AccessText + finalUrl);

        return res.json({
            success: true,
            message: 'Account activated successfully. Check your email for access credentials.',
            KeyCompany: keyCompany,
            UserName: userName,
        });
    } catch (err) {
        const { message } = handleError(err);
        return res.status(500).json({ success: false, error: message });
    }
}

router.post('/validate-pin', handleValidatePin);

export default router;
