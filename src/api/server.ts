import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import musicRoutes from './routes/music';
import youtubeRoutes from './routes/youtube';
import appRoutes from './routes/app';
import validateRoutes from './routes/validate';
import { errorMiddleware } from '../utils/errorHandler';
import { startYoutubeSyncJob } from './jobs/youtubeSync';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serving static files from the 'dist' directory
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/v1/app', appRoutes);
app.use('/v1/auth', validateRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorMiddleware);

// Catch-all route to serve index.html for SPA (must be after other routes)
app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
    // Start background jobs
    startYoutubeSyncJob();
});

export default app;
