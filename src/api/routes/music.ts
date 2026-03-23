import { Router, Request, Response } from 'express';
import { eq, asc, sql } from 'drizzle-orm';
import { db } from '../../db/db';
import { eventMusic, event } from '../../db/schema';
import { handleError } from '../../utils/errorHandler';
import { verifyToken } from '../../utils/jws';
import { isExpired } from '../../utils/timezone';

const router = Router();

// Get music for an event
router.get('/event/:eventId', async (req: Request, res: Response) => {
    try {
        const eventId = parseInt(req.params.eventId as string);        //console.log("Event ID", eventId);
        if (isNaN(eventId)) {
            return res.status(400).json({ success: false, error: 'Invalid event ID' });
        }

        let isAdmin = false;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = await verifyToken(token);
            //console.log('DEBUG Music Access [/event/:eventId] - Payload:', JSON.stringify(payload));
            if (payload &&
                typeof payload.UserName === 'string' && payload.UserName.trim() !== '' &&
                typeof payload.PIN === 'string' && payload.PIN.trim() !== '') {
                isAdmin = true;
            }
        }
        //console.log('DEBUG Music Access [/event/:eventId] - Evaluated isAdmin:', isAdmin);

        const eventData = await db.query.event.findFirst({
            where: eq(event.idEvent, eventId),
            with: { company: true },
        });

        if (!eventData) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        console.log("Is active", eventData.active);
        console.log("Is expired", isExpired(new Date(eventData.eventDate), 12));
        console.log("Is company active", eventData.company?.active);
        // Tiered Access Control:
        // Guests are blocked if event is NOT active or NOT in the 12h window.
        // Or if the COMPANY is NOT active.
        // Admins with UserName and PIN (isAdmin = true) are allowed always.
        if (!eventData.active || isExpired(new Date(eventData.eventDate), 12) || !eventData.company?.active) {
            if (!isAdmin) {
                const errorMsg = !eventData.company?.active ? 'La compañía está inactiva' : 'El evento no está activo';
                return res.status(403).json({ success: false, error: errorMsg });
            }
        }

        const music = await db.query.eventMusic.findMany({
            where: sql`${eventMusic.idEvent} = ${eventId} AND ${eventMusic.visible} = true`,
            orderBy: [asc(eventMusic.number)],
        });

        const musicResult = music.map(m => ({
            ...m,
            url: isAdmin ? m.url : '', // Only show URL to Admins
        }));

        res.json({ success: true, music: musicResult, isAdmin });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Get music by event token
router.get('/event-token/:eventToken', async (req: Request, res: Response) => {
    try {
        const eventToken = req.params.eventToken as string;

        const eventData = await db.query.event.findFirst({
            where: eq(event.eventToken, eventToken),
            with: { company: true },
        });

        if (!eventData) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // console.log('DEBUG Music Access - Event Status:', {
        //     id: eventData.idEvent,
        //     active: eventData.active,
        //     date: eventData.eventDate,
        //     now: new Date()
        // });

        let isAdmin = false;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = await verifyToken(token);
            //console.log('DEBUG Music Access [/event-token/:eventToken] - Payload:', JSON.stringify(payload));
            if (payload &&
                typeof payload.UserName === 'string' && payload.UserName.trim() !== '' &&
                typeof payload.PIN === 'string' && payload.PIN.trim() !== '') {
                isAdmin = true;
            }
        }
        //   console.log('DEBUG Music Access [/event-token/:eventToken] - Evaluated isAdmin:', isAdmin);

        // Tiered Access Control:
        // Guests are blocked if event is NOT active or NOT in the 12h window.
        // Or if the COMPANY is NOT active.
        // Admins with UserName and PIN (isAdmin = true) are allowed always.
        if (!eventData.active || isExpired(new Date(eventData.eventDate), 12) || !eventData.company?.active) {
            //console.log('DEBUG Music Access - Inactive/Expired check triggered');
            if (!isAdmin) {
                //console.log('DEBUG Music Access - Blocking guest');
                const errorMsg = !eventData.company?.active ? 'La compañía está inactiva' : 'El evento no está activo';
                return res.status(403).json({ success: false, error: errorMsg });
            }
            //console.log('DEBUG Music Access - Allowing Admin bypass');
        }

        const music = await db.query.eventMusic.findMany({
            where: sql`${eventMusic.idEvent} = ${eventData.idEvent} AND ${eventMusic.visible} = true`,
            orderBy: [asc(eventMusic.number)],
        });

        const musicResult = music.map(m => ({
            ...m,
            url: isAdmin ? m.url : '', // Only show URL to Admins
        }));

        res.json({ success: true, music: musicResult, event: eventData, isAdmin });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Add music to event
router.post('/', async (req: Request, res: Response) => {
    try {
        const { idEvent, url, title } = req.body;

        if (!idEvent || !url || !title) {
            return res.status(400).json({
                success: false,
                error: 'Event ID, URL, and title are required'
            });
        }

        const eventId = parseInt(idEvent);

        const existingMusic = await db.query.eventMusic.findMany({
            where: eq(eventMusic.idEvent, eventId),
        });

        const maxNumber = existingMusic.length > 0
            ? Math.max(...existingMusic.map(m => m.number))
            : 0;

        const [newMusic] = await db.insert(eventMusic).values({
            idEvent: eventId,
            url: url.substring(0, 255),
            title: title.substring(0, 100),
            number: maxNumber + 1,
            likes: 0,
        }).returning();

        res.status(201).json({ success: true, music: newMusic });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Add like to music
router.post('/:musicId/like', async (req: Request, res: Response) => {
    try {
        const musicId = parseInt(req.params.musicId as string);

        if (isNaN(musicId)) {
            return res.status(400).json({ success: false, error: 'Invalid music ID' });
        }

        const existingMusic = await db.query.eventMusic.findFirst({
            where: eq(eventMusic.idEventMusic, musicId),
        });

        if (!existingMusic) {
            return res.status(404).json({ success: false, error: 'Music not found' });
        }

        const [updatedMusic] = await db.update(eventMusic)
            .set({ likes: sql`${eventMusic.likes} + 1` })
            .where(eq(eventMusic.idEventMusic, musicId))
            .returning();

        res.json({ success: true, music: updatedMusic });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Remove like from music
router.post('/:musicId/unlike', async (req: Request, res: Response) => {
    try {
        const musicId = parseInt(req.params.musicId as string);

        if (isNaN(musicId)) {
            return res.status(400).json({ success: false, error: 'Invalid music ID' });
        }

        const existingMusic = await db.query.eventMusic.findFirst({
            where: eq(eventMusic.idEventMusic, musicId),
        });

        if (!existingMusic) {
            return res.status(404).json({ success: false, error: 'Music not found' });
        }

        const [updatedMusic] = await db.update(eventMusic)
            .set({ likes: sql`CASE WHEN ${eventMusic.likes} > 0 THEN ${eventMusic.likes} - 1 ELSE 0 END` })
            .where(eq(eventMusic.idEventMusic, musicId))
            .returning();

        res.json({ success: true, music: updatedMusic });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Delete music
router.delete('/:musicId', async (req: Request, res: Response) => {
    try {
        const musicId = parseInt(req.params.musicId as string);

        if (isNaN(musicId)) {
            return res.status(400).json({ success: false, error: 'Invalid music ID' });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const payload = await verifyToken(token);

        if (!payload ||
            typeof payload.UserName !== 'string' || payload.UserName.trim() === '' ||
            typeof payload.PIN !== 'string' || payload.PIN.trim() === '') {
            return res.status(403).json({ success: false, error: 'Forbidden: Valid Admin credentials required' });
        }

        const [deletedMusic] = await db.delete(eventMusic)
            .where(eq(eventMusic.idEventMusic, musicId))
            .returning();

        if (!deletedMusic) {
            return res.status(404).json({ success: false, error: 'Music not found' });
        }

        res.json({ success: true, message: 'Music deleted successfully' });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

// Reorder music
router.put('/reorder', async (req: Request, res: Response) => {
    try {
        const { musicIds } = req.body; // Array of music IDs in new order

        if (!Array.isArray(musicIds)) {
            return res.status(400).json({ success: false, error: 'musicIds array is required' });
        }

        for (let i = 0; i < musicIds.length; i++) {
            await db.update(eventMusic)
                .set({ number: i + 1 })
                .where(eq(eventMusic.idEventMusic, musicIds[i]));
        }

        res.json({ success: true, message: 'Music reordered successfully' });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
