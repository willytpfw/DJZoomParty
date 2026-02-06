import { Router, Request, Response } from 'express';
import { handleError } from '../../utils/errorHandler';

const router = Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface YouTubeSearchResult {
    id: {
        videoId: string;
    };
    snippet: {
        title: string;
        description: string;
        thumbnails: {
            default: {
                url: string;
                width: number;
                height: number;
            };
            medium: {
                url: string;
                width: number;
                height: number;
            };
            high: {
                url: string;
                width: number;
                height: number;
            };
        };
        channelTitle: string;
        publishedAt: string;
    };
}

interface YouTubeAPIResponse {
    items: YouTubeSearchResult[];
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

// Search YouTube videos
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ success: false, error: 'Search query (q) is required' });
        }

        if (!YOUTUBE_API_KEY) {
            return res.status(500).json({ success: false, error: 'YouTube API key not configured' });
        }

        const encodedQuery = encodeURIComponent(q);
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodedQuery}&type=video&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('YouTube API error:', errorData);
            return res.status(response.status).json({
                success: false,
                error: 'YouTube API error',
                details: errorData,
            });
        }

        const data: YouTubeAPIResponse = await response.json();

        // Transform results to simpler format
        const videos = data.items.map((item) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.default.url,
            thumbnailMedium: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }));

        res.json({ success: true, videos });
    } catch (error) {
        const { message } = handleError(error);
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
