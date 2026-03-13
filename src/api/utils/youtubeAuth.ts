import { google } from 'googleapis';

const client_id = process.env.YOUTUBE_CLIENT_ID;
const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
const refresh_token = process.env.YOUTUBE_REFRESH_TOKEN;

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    // Provide a redirect_uri if needed, though for background tasks refresh_token is enough
    process.env.URLLOCAL || 'http://localhost:3001'
);

if (refresh_token) {
    oauth2Client.setCredentials({ refresh_token });
} else {
    console.warn('YOUTUBE_REFRESH_TOKEN is not set. YouTube Playlist creation will fail.');
}

// Initialize YouTube API client
const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
});

/**
 * Creates a new YouTube playlist for an event.
 * @param title The title of the playlist.
 * @param description An optional description.
 * @returns The ID of the created playlist.
 */
export const createYouTubePlaylist = async (title: string, description: string = ''): Promise<string | null> => {
    try {
        if (!refresh_token) {
            console.error('Cannot create playlist: Missing YOUTUBE_REFRESH_TOKEN');
            return null;
        }

        const response = await youtube.playlists.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title,
                    description,
                },
                status: {
                    privacyStatus: 'unlisted' // 'public', 'private', or 'unlisted'
                }
            }
        });

        return response.data.id || null;
    } catch (error: any) {
        console.error('Error creating YouTube playlist:', error);
        throw new Error(error?.message || 'Error creating YouTube playlist');
    }
};

/**
 * Adds a video to a YouTube playlist.
 * @param playlistId The ID of the playlist.
 * @param videoId The ID of the YouTube video to add.
 * @returns True if successful, false otherwise.
 */
export const addVideoToPlaylist = async (playlistId: string, videoId: string): Promise<boolean> => {
    try {
        if (!refresh_token) {
            console.error('Cannot add video: Missing YOUTUBE_REFRESH_TOKEN');
            return false;
        }

        await youtube.playlistItems.insert({
            part: ['snippet'],
            requestBody: {
                snippet: {
                    playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId,
                    }
                }
            }
        });

        return true;
    } catch (error: any) {
        console.error(`Error adding video ${videoId} to playlist ${playlistId}:`, error);
        throw new Error(error?.message || `Error adding video to playlist`);
    }
};

/**
 * Extracts the video ID from a YouTube URL.
 * Accepts formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * @param url The full YouTube URL.
 * @returns The extracted video ID, or null if invalid.
 */
export const extractVideoId = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        }
        return null; // Not a recognized YouTube URL format
    } catch (e) {
        return null; // Invalid URL
    }
};
