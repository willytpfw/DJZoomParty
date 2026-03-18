import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/db';
import { company, user, userCompany } from '../../db/schema';
import { verifyToken } from '../../utils/jws';
import { handleError } from '../../utils/errorHandler';

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

export default router;
