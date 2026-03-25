import { Router, Request, Response } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../db/db';
import { company, user, userCompany, userLogin } from '../../db/schema';
import { verifyToken } from '../../utils/jws';
import { handleError } from '../../utils/errorHandler';
import { sendEmail } from '../../utils/emailHelper';
import { getCurrentDateUTC6 } from '../../utils/timezone';
import * as jose from 'jose';
import { addDays, addMonths, addYears } from 'date-fns';

const router = Router();

// Middleware to authenticate and get user info
const auth = async (req: Request, res: Response, next: Function) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }


        const payload = await verifyToken(token);
        if (!payload || !payload.UserName) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const userData = await db.query.user.findFirst({
            where: eq(user.userName, payload.UserName),
        });

        if (!userData) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        // Attach user info to request
        (req as any).user = userData;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Authentication failed' });
    }
};

// GET /api/company - List all companies (Admin only) or own company
router.get('/', auth, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;

        if (currentUser.administrator) {
            const allCompanies = await db.query.company.findMany();
            return res.json({ success: true, companies: allCompanies });
        }

        // Non-admin: only associated companies
        const userCompanies = await db.query.userCompany.findMany({
            where: eq(userCompany.idUser, currentUser.idUser),
            with: { company: true }
        });

        const companies = userCompanies.map(uc => uc.company);
        res.json({ success: true, companies });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// GET /api/company/:id - Get specific company
router.get('/:id', auth, async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const companyId = parseInt(typeof idParam === 'string' ? idParam : idParam[0]);
        const currentUser = (req as any).user;

        if (isNaN(companyId)) {
            return res.status(400).json({ success: false, error: 'Invalid company ID' });
        }

        // Check if admin or associated
        if (!currentUser.administrator) {
            const association = await db.query.userCompany.findFirst({
                where: and(
                    eq(userCompany.idUser, currentUser.idUser),
                    eq(userCompany.idCompany, companyId)
                )
            });

            if (!association) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        const companyData = await db.query.company.findFirst({
            where: eq(company.idCompany, companyId)
        });

        if (!companyData) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        // Check if company is active for non-admin
        if (!companyData.active && !currentUser.administrator) {
            return res.status(403).json({ success: false, error: 'Acceso denegado: La compañía está inactiva' });
        }

        res.json({ success: true, company: companyData });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// PUT /api/company/:id - Update company
router.put('/:id', auth, async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const companyId = parseInt(typeof idParam === 'string' ? idParam : idParam[0]);
        const currentUser = (req as any).user;
        const updates = req.body;

        if (isNaN(companyId)) {
            return res.status(400).json({ success: false, error: 'Invalid company ID' });
        }

        // Check if company exists
        const existingCompany = await db.query.company.findFirst({
            where: eq(company.idCompany, companyId)
        });

        if (!existingCompany) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        let finalUpdates: any = {};

        if (currentUser.administrator) {
            // Admin can update everything
            finalUpdates = {
                ...(updates.name && { name: updates.name }),
                ...(updates.active !== undefined && { active: updates.active }),
                ...(updates.url && { url: updates.url }),
                ...(updates.urlImagen && { urlImagen: updates.urlImagen }),
                ...(updates.keyCompany && { keyCompany: updates.keyCompany }),
                ...(updates.urlInstagram && { urlInstagram: updates.urlInstagram }),
                ...(updates.urlFacebook && { urlFacebook: updates.urlFacebook }),
                ...(updates.webPage && { webPage: updates.webPage }),
            };
        } else {
            // Non-admin: check association
            const association = await db.query.userCompany.findFirst({
                where: and(
                    eq(userCompany.idUser, currentUser.idUser),
                    eq(userCompany.idCompany, companyId)
                )
            });

            if (!association) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Allowed fields for non-admin: url_imagen, url_instagram, url_facebook, web_page
            // Note: DB schema uses camelCase for these in drizzle
            if (updates.urlImagen) finalUpdates.urlImagen = updates.urlImagen;
            if (updates.urlInstagram) finalUpdates.urlInstagram = updates.urlInstagram;
            if (updates.urlFacebook) finalUpdates.urlFacebook = updates.urlFacebook;
            if (updates.webPage) finalUpdates.webPage = updates.webPage;

            // Check if they tried to update restricted fields
            const restrictedFields = ['name', 'active', 'url', 'keyCompany'];
            const attemptedRestricted = Object.keys(updates).filter(k => restrictedFields.includes(k));

            if (attemptedRestricted.length > 0) {
                // We should probably just ignore them or return error. 
                // The requirement says "solo puede modificar...". I'll just only include allowed ones.
            }

            if (Object.keys(finalUpdates).length === 0) {
                return res.status(400).json({ success: false, error: 'No valid fields provided for update' });
            }
        }

        const [updatedCompany] = await db.update(company)
            .set(finalUpdates)
            .where(eq(company.idCompany, companyId))
            .returning();

        res.json({ success: true, company: updatedCompany });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// POST /api/company/:id/generate-token - Generate access URL for company (Admin only)
router.post('/:id/generate-token', auth, async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).user;
        if (!currentUser.administrator) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const idParam = req.params.id;
        const companyId = parseInt(typeof idParam === 'string' ? idParam : idParam[0]);

        if (isNaN(companyId)) {
            return res.status(400).json({ success: false, error: 'Invalid company ID' });
        }

        const companyData = await db.query.company.findFirst({
            where: eq(company.idCompany, companyId)
        });

        if (!companyData) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        // Check if company license has expired
        if (companyData.validityDate && companyData.validityDate < getCurrentDateUTC6()) {
            return res.status(403).json({
                success: false,
                code: 'LICENSE_EXPIRED',
                error: 'Company license has expired',
                validityDate: companyData.validityDate.toISOString()
            });
        }

        // Find the first user associated with this company
        const userCompanyData = await db.query.userCompany.findFirst({
            where: eq(userCompany.idCompany, companyId),
            with: { user: true }
        });

        if (!userCompanyData || !userCompanyData.user) {
            return res.status(404).json({ success: false, error: 'No user associated with this company' });
        }

        const targetUser = userCompanyData.user;

        // Generate a 6-digit PIN
        const chars = '0123456789';
        let newPin = '';
        for (let i = 0; i < 6; i++) {
            newPin += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Expire all previous active pins for this user
        await db.update(userLogin)
            .set({ date: addDays(getCurrentDateUTC6(), -1) })
            .where(and(eq(userLogin.idUser, targetUser.idUser), gt(userLogin.date, addDays(getCurrentDateUTC6(), -1))));

        // Insert new user_login record
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        await db.insert(userLogin).values({
            idUser: targetUser.idUser,
            pin: newPin,
            ip: typeof ip === 'string' ? ip.substring(0, 45) : String(ip).substring(0, 45),
            response: '200',
            date: addMonths(getCurrentDateUTC6(), 1)
        });
        console.log('New PIN generated:', newPin);
        // Create JWT
        const API_URL = process.env.PRODUCTION === 'true' ? process.env.API_BASE_URL : process.env.URLLOCAL;
        const SIGN_SECRET = process.env.SignJWS || 'default-secret-key-change-in-production';
        const finalSecret = new TextEncoder().encode(SIGN_SECRET);
        // Use company's validityDate as JWT expiration; fallback to 1 year if not set
        const jwtExpiration = companyData.validityDate ?? addYears(getCurrentDateUTC6(), 1);
        const finalToken = await new jose.SignJWT({
            KeyCompany: companyData.keyCompany,
            UserName: targetUser.userName,
            PIN: newPin
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(jwtExpiration)
            .sign(finalSecret);

        const AccessText = 'Da clic en la siguiente dirección para acceder a la aplicacion. \n\n';
        const finalUrl = `${API_URL}?token=${finalToken}`;

        // Send Email
        if (targetUser.eMail) {
            await sendEmail(targetUser.eMail, `Acceso a ${process.env.APP_NAME}`, AccessText + finalUrl);
        }

        res.json({ success: true, url: finalUrl, pin: newPin });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
