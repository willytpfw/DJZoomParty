import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/db';
import { event, eventMusic } from '../../db/schema';
import { addVideoToPlaylist, extractVideoId } from '../utils/youtubeAuth';

export const startYoutubeSyncJob = () => {
    // Get refresh interval from env, default to 5 minutes if not present
    const refreshMinutes = parseInt(process.env.PlayListRefresh || '5');

    // Ensure it doesn't poll too fast (e.g., minimum 1 minute)
    const validMinutes = Math.max(1, refreshMinutes);
    const intervalMs = validMinutes * 60 * 1000;

    console.log(`Starting YouTube sync job. Running every ${validMinutes} minutes.`);

    setInterval(async () => {
        console.log(`[YouTube Sync] Running sync job at ${new Date().toISOString()}`);
        try {
            // Find all active events that have PlayList enabled, refreshList enabled, and a valid youtubePlaylistId
            const activePlaylists = await db.query.event.findMany({
                where: and(
                    eq(event.active, true),
                    eq(event.playList, true),
                    eq(event.refreshList, true)
                ),
            });

            for (const currentEvent of activePlaylists) {
                if (!currentEvent.youtubePlaylistId) {
                    continue; // Skip if no playlist ID
                }
                console.log(`[YouTube Sync] Event ${currentEvent.name}`);
                // Find the highest voted, currently visible song
                const [topSong] = await db.query.eventMusic.findMany({
                    where: and(
                        eq(eventMusic.idEvent, currentEvent.idEvent),
                        eq(eventMusic.visible, true)
                    ),
                    orderBy: [desc(eventMusic.likes), desc(eventMusic.idEventMusic)],
                    limit: 1
                });

                if (topSong) {
                    console.log(`[YouTube Sync] Event ${currentEvent.idEvent}: Found top song "${topSong.title}" (${topSong.likes} likes)`);

                    const videoId = extractVideoId(topSong.url);

                    if (videoId) {
                        const success = await addVideoToPlaylist(currentEvent.youtubePlaylistId, videoId);

                        // If successfully added to YouTube (or if it's not a valid YouTube URL maybe we just hide it)
                        // For now we'll only mark as not visible if it succeeds or if we decide to force it
                        if (success) {
                            console.log(`[YouTube Sync] Event ${currentEvent.idEvent}: Successfully added "${topSong.title}" to YouTube.`);

                            // Mark song as no longer visible
                            await db.update(eventMusic)
                                .set({ visible: false })
                                .where(eq(eventMusic.idEventMusic, topSong.idEventMusic));
                        } else {
                            console.error(`[YouTube Sync] Event ${currentEvent.idEvent}: Failed to add "${topSong.title}" to YouTube.`);
                        }
                    } else {
                        console.warn(`[YouTube Sync] Event ${currentEvent.idEvent}: Song "${topSong.title}" does not have a valid YouTube URL. Marking as not visible anyway to prevent block.`);
                        // Hide it anyway so it doesn't block the queue if someone added a bad URL
                        await db.update(eventMusic)
                            .set({ visible: false })
                            .where(eq(eventMusic.idEventMusic, topSong.idEventMusic));
                    }
                }
            }
        } catch (error) {
            console.error('[YouTube Sync] Error in sync job:', error);
        }
    }, intervalMs);
};
