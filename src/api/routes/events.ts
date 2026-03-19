import { Router, Request, Response } from 'express';
import { eq, asc, inArray } from 'drizzle-orm';
import { db } from '../../db/db';
import { event, eventMusic, userCompany, user } from '../../db/schema';
import { createToken } from '../../utils/jws';
import { handleError } from '../../utils/errorHandler';
import { randomBytes } from 'crypto';
import { createYouTubePlaylist } from '../utils/youtubeAuth';

const router = Router();

// Get events by company ID
router.get('/company/:companyId', async (req: Request, res: Response) => {
    try {
        //console.log('Get events by company ID');
        const companyId = parseInt(req.params.companyId as string);
        const administrator = req.params.administrator as string;

        if (isNaN(companyId)) {
            return res.status(400).json({ success: false, error: 'Invalid company ID' });
        }

        const events = await db.query.event.findMany({
            where: eq(event.idCompany, companyId),
            orderBy: [asc(event.eventDate)],
        });

        res.json({ success: true, events, administrator });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Get single event by ID
router.get('/:eventId', async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId as string);

        if (isNaN(eventId)) {
            return res.status(400).json({ success: false, error: 'Invalid event ID' });
        }

        const eventData = await db.query.event.findFirst({
            where: eq(event.idEvent, eventId),
            with: { company: true },
        });

        if (!eventData) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        res.json({ success: true, event: eventData });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Create new event
router.post('/', async (req: Request, res: Response) => {
    try {
        const { idCompany, name, eventDate, positionLongitud, positionLatitud, playList } = req.body;

        if (!idCompany || !eventDate || !name) {
            return res.status(400).json({
                success: false,
                error: 'Company ID, event name, and event date are required'
            });
        }

        // Generate unique event token (16 characters)
        const eventToken = randomBytes(8).toString('hex');

        let youtubePlaylistId: string | null = null;
        const isPlayListEnabled = playList === true || playList === 'true';

        if (isPlayListEnabled) {
            try {
                // If PlayList is true, try to create the playlist
                const createdPlaylistId = await createYouTubePlaylist(
                    name.substring(0, 50),
                    `Playlist for event ${name} created by AppEvents`
                );

                if (createdPlaylistId) {
                    youtubePlaylistId = createdPlaylistId;
                } else {
                    console.warn('Playlist creation requested but failed or no token was found.');
                }
            } catch (error: any) {
                console.error('Error attempting to create YouTube playlist during event creation', error);

                return res.status(400).json({
                    success: false,
                    error: `No se pudo crear la PlayList en YouTube: ${error.message}. (Si acabas de habilitar la API, espera unos minutos y vuelve a intentarlo).`
                });
            }
        }

        const [newEvent] = await db.insert(event).values({
            idCompany: parseInt(idCompany),
            name: name.substring(0, 50),
            eventDate: new Date(eventDate),
            eventToken,
            positionLongitud: positionLongitud ? parseFloat(positionLongitud) : null,
            positionLatitud: positionLatitud ? parseFloat(positionLatitud) : null,
            playList: isPlayListEnabled,
            youtubePlaylistId,
            active: true,
            creationDate: new Date(),
        }).returning();

        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Update event
router.put('/:eventId', async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId as string);
        const { name, eventDate, active, positionLongitud, positionLatitud } = req.body;

        if (isNaN(eventId)) {
            return res.status(400).json({ success: false, error: 'Invalid event ID' });
        }

        const [updatedEvent] = await db.update(event)
            .set({
                ...(name && { name: name.substring(0, 50) }),
                ...(eventDate && { eventDate: new Date(eventDate) }),
                ...(typeof active === 'boolean' && { active }),
                ...(positionLongitud !== undefined && { positionLongitud: parseFloat(positionLongitud) }),
                ...(positionLatitud !== undefined && { positionLatitud: parseFloat(positionLatitud) }),
            })
            .where(eq(event.idEvent, eventId))
            .returning();

        if (!updatedEvent) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        res.json({ success: true, event: updatedEvent });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Delete event
router.delete('/:eventId', async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId as string);

        if (isNaN(eventId)) {
            return res.status(400).json({ success: false, error: 'Invalid event ID' });
        }

        // Validate event exists before deleting
        const existingEvent = await db.query.event.findFirst({
            where: eq(event.idEvent, eventId),
        });

        if (!existingEvent) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // First, delete associated music list
        await db.delete(eventMusic).where(eq(eventMusic.idEvent, eventId));

        // Then, delete the event
        await db.delete(event)
            .where(eq(event.idEvent, eventId));

        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Generate QR code URL for event
router.get('/:eventId/qr-data', async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId as string);

        if (isNaN(eventId)) {
            return res.status(400).json({ success: false, error: 'Invalid event ID' });
        }

        const eventData = await db.query.event.findFirst({
            where: eq(event.idEvent, eventId),
            with: { company: true },
        });

        if (!eventData || !eventData.company) {
            return res.status(404).json({ success: false, error: 'Event or company not found' });
        }

        // Create JWS token for event
        const token = await createToken({
            KeyCompany: eventData.company.keyCompany,
            EventToken: eventData.eventToken,
        })

        // Build URL
        let baseUrl = eventData.company.url || process.env.URLLOCAL;
        if (process.env.PRODUCTION === 'false') {
            baseUrl = process.env.URLLOCAL;
        }
        const eventUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;

        res.json({
            success: true,
            qrData: eventUrl,
            token,
            event: eventData,
        });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Get events for a user (via UserCompany)
router.get('/user/:userName', async (req: Request, res: Response) => {
    try {
        //console.log('Get events for user');
        const { userName } = req.params;
        // Fix Type  'string | SQLWrapper'

        const userData = await db.query.user.findFirst({
            where: eq(user.userName, userName as unknown as string),
        });

        if (!userData) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Get user's companies
        const userCompanies = await db.query.userCompany.findMany({
            where: eq(userCompany.idUser, userData.idUser),
        });

        const companyIds = userCompanies.map(uc => uc.idCompany);

        // Get events for all user's companies in a single query to ensure correct global sorting
        if (companyIds.length === 0) {
            return res.json({ success: true, events: [] });
        }

        const events = await db.query.event.findMany({
            where: inArray(event.idCompany, companyIds),
            orderBy: [asc(event.eventDate)],
            with: { company: true },
        });

        res.json({ success: true, events, administrator: userData.administrator });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
