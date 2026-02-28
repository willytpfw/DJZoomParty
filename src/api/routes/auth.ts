import { Router, Request, Response } from 'express';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from '../../db/db';
import { user, userLogin, company, userCompany, event } from '../../db/schema';
import { verifyToken, createToken } from '../../utils/jws';
import { isWithinHours, getCurrentDateUTC6 } from '../../utils/timezone';
import { handleError } from '../../utils/errorHandler';
import { addHours } from 'date-fns';

const router = Router();

import { sendPinToUser } from '../../utils/smsHelper';


// Validate JWS token
router.post('/validate-token', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token is required' });
        }

        const payload = await verifyToken(token);

        if (!payload) {
            return res.status(401).json({ success: false, error: 'Invalid token signature' });
        }

        // Get company by KeyCompany
        const companyData = await db.query.company.findFirst({
            where: eq(company.keyCompany, payload.KeyCompany),
        });

        if (!companyData) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        let redirectTo = '';
        let valid = false;

        // If EventToken is present, validate event access
        if (payload.EventToken) {
            const eventData = await db.query.event.findFirst({
                where: eq(event.eventToken, payload.EventToken),
            });

            if (eventData && isWithinHours(eventData.eventDate, 12)) {
                redirectTo = 'music';
                valid = true;
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Event not found or expired (more than 12 hours since event date)'
                });
            }
        }
        // If UserName is present, validate user login
        else if (payload.UserName) {

            const userData = await db.query.user.findFirst({
                where: eq(user.userName, payload.UserName),
            });

            if (!userData) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            // Check if user is associated with the company
            const userCompanyAssociation = await db.query.userCompany.findFirst({
                where: and(
                    eq(userCompany.idUser, userData.idUser),
                    eq(userCompany.idCompany, companyData.idCompany)
                ),
            });

            if (!userCompanyAssociation) {
                return res.status(403).json({ success: false, error: 'User not associated with this company' });
            }

            // Check if strict PIN login is valid within 24 hours
            const twentyFourHoursAgo = addHours(getCurrentDateUTC6(), -24);
            const validLogin = await db.query.userLogin.findFirst({
                where: and(
                    eq(userLogin.idUser, userData.idUser),
                    gt(userLogin.date, twentyFourHoursAgo),
                    eq(userLogin.response, '200')
                ),
            });

            if (validLogin) {
                redirectTo = 'events';
                valid = true;
            } else {
                // User needs to verify PIN
                redirectTo = 'pin-verification';
                valid = false;
            }
        }

        res.json({
            success: true,
            valid,
            redirectTo,
            company: {
                idCompany: companyData.idCompany,
                name: companyData.name,
                urlImagen: companyData.urlImagen,
                keyCompany: companyData.keyCompany,
            },
            payload,
        });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Get company by keyCompany
router.get('/company/:keyCompany', async (req: Request, res: Response) => {
    try {
        const keyCompanyParam = String(req.params.keyCompany);

        const companyData = await db.query.company.findFirst({
            where: eq(company.keyCompany, keyCompanyParam),
        });

        if (!companyData) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        res.json({ success: true, company: companyData });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Send PIN via Twilio SMS
router.post('/send-pin', async (req: Request, res: Response) => {
    try {
        const { userName } = req.body;

        if (!userName) {
            return res.status(400).json({ success: false, error: 'UserName is required' });
        }

        const userData = await db.query.user.findFirst({
            where: eq(user.userName, userName),
        });

        if (!userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!userData.movil) {
            return res.status(400).json({ success: false, error: 'User has no mobile number' });
        }

        const pin = await sendPinToUser(userData.movil, userName);

        // Get client IP
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        // Save login attempt
        await db.insert(userLogin).values({
            idUser: userData.idUser,
            pin,
            ip: typeof ip === 'string' ? ip.substring(0, 45) : String(ip).substring(0, 45),
            response: 'pending',
            date: getCurrentDateUTC6(),
        });

        res.json({
            success: true,
            message: 'PIN sent successfully',
            // In dev mode, also return PIN
            ...(process.env.NODE_ENV === 'development' && { pin }),
        });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Verify PIN
router.post('/verify-pin', async (req: Request, res: Response) => {
    try {
        const { userName, pin, keyCompany } = req.body;

        if (!userName || !pin) {
            return res.status(400).json({ success: false, error: 'UserName and PIN are required' });
        }

        const userData = await db.query.user.findFirst({
            where: eq(user.userName, userName),
        });

        if (!userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Check for valid PIN in last 24 hours
        const twentyFourHoursAgo = addHours(getCurrentDateUTC6(), -24);

        // 1. Check if PIN exists for this user (ignoring time first to detect expired)
        const loginRecord = await db.query.userLogin.findFirst({
            where: and(
                eq(userLogin.idUser, userData.idUser),
                eq(userLogin.pin, pin)
            ),
            orderBy: [desc(userLogin.date)] // Get the most recent one
        });

        if (!loginRecord) {
            return res.status(401).json({ success: false, error: 'Invalid PIN' });
        }

        // 2. Check if it is expired (> 24h)

        // Actually, easier to just check against the timestamp directly if db returns Date object
        // loginRecord.date is a Date object (UTC usually from pg driver, but we handle it)

        if (loginRecord.date! <= twentyFourHoursAgo) {
            // EXPIRED: Generate new PIN and send it
            if (!userData.movil) {
                return res.status(400).json({ success: false, error: 'PIN expired and user has no mobile number to receive a new one.' });
            }

            const newPin = await sendPinToUser(userData.movil, userData.userName);

            // Identify client IP
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

            // Save new login attempt
            await db.insert(userLogin).values({
                idUser: userData.idUser,
                pin: newPin,
                ip: typeof ip === 'string' ? ip.substring(0, 45) : String(ip).substring(0, 45),
                response: 'pending',
                date: getCurrentDateUTC6(),
            });

            return res.json({
                success: false,
                error: 'PIN expired. A new PIN has been sent to your mobile device.',
                code: 'PIN_EXPIRED_NEW_SENT',
                // For dev convenience
                ...(process.env.NODE_ENV === 'development' && { newPin }),
            });
        }

        // Update login response
        await db.update(userLogin)
            .set({ response: '200' })
            .where(eq(userLogin.idUserLogin, loginRecord.idUserLogin));

        // Get user's company
        const userCompanyData = await db.query.userCompany.findFirst({
            where: eq(userCompany.idUser, userData.idUser),
            with: { company: true },
        });

        // Create new token for authenticated user
        const token = await createToken({
            KeyCompany: keyCompany || userCompanyData?.company?.keyCompany || '',
            UserName: userName,
            PIN: pin, // Include PIN in token
        });

        res.json({
            success: true,
            message: 'PIN verified successfully',
            token,
            user: {
                idUser: userData.idUser,
                userName: userData.userName,
                administrator: userData.administrator,
            },
        });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Get user by userName
router.get('/user/:userName', async (req: Request, res: Response) => {
    try {
        const userNameParam = String(req.params.userName);

        const userData = await db.query.user.findFirst({
            where: eq(user.userName, userNameParam),
        });

        if (!userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                idUser: userData.idUser,
                userName: userData.userName,
                eMail: userData.eMail,
                administrator: userData.administrator,
                active: userData.active,
            },
        });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
