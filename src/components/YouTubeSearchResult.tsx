import { Plus, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface YouTubeVideo {
    videoId: string;
    title: string;
    thumbnail: string;
    thumbnailMedium: string;
    channelTitle: string;
    url: string;
}

interface YouTubeSearchResultProps {
    video: YouTubeVideo;
    onAdd: () => void;
}

export default function YouTubeSearchResult({ video, onAdd }: YouTubeSearchResultProps) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
            {/* Thumbnail */}
            <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
            >
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-24 h-18 object-cover rounded-lg"
                />
            </a>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate text-sm">{video.title}</h4>
                <p className="text-xs text-gray-400 truncate">{video.channelTitle}</p>
                <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-disco-cyan hover:underline flex items-center gap-1 mt-1"
                >
                    <ExternalLink className="w-3 h-3" />
                    {t('youtubeSearch.view_on_youtube')}
                </a>
            </div>

            <button
                onClick={onAdd}
                className="shrink-0 p-2 rounded-full bg-disco-purple/20 hover:bg-disco-purple text-white transition"
                title={t('youtubeSearch.add_to_playlist')}
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
    );
}
