import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Music,
    Heart,
    ExternalLink,
    Loader2,
    Youtube,
    Instagram,
    Facebook,
    Trash2,
    Plus
} from 'lucide-react';


interface EventMusic {
    idEventMusic: number;
    idEvent: number;
    number: number;
    url: string;
    title: string;
    likes: number;
}

interface Event {
    idEvent: number;
    name: string;
    eventToken: string;
    eventDate: string;
    active: boolean;
    company?: {
        name: string;
        urlInstagram?: string;
        urlFacebook?: string;
        url?: string;
    };
}

interface YouTubeVideo {
    videoId: string;
    title: string;
    thumbnail: string;
    thumbnailMedium: string;
    channelTitle: string;
    url: string;
}

export default function MusicListPage() {
    const { eventToken } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [music, setMusic] = useState<EventMusic[]>([]);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
    const [searching, setSearching] = useState(false);

    const [likedSongs, setLikedSongs] = useState<Set<number>>(() => {
        // Load liked songs from localStorage on mount
        const stored = localStorage.getItem('likedSongs');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return new Set(parsed);
            } catch (err) {
                return new Set();
            }
        }
        return new Set();
    });
    const [isAdmin, setIsAdmin] = useState(false);

    // Save liked songs to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('likedSongs', JSON.stringify([...likedSongs]));
    }, [likedSongs]);

    // Get token from localStorage
    const getToken = () => {
        return localStorage.getItem('authToken');
    };

    useEffect(() => {
        if (eventToken) {
            fetchMusicByToken();
        } else {
            setError('No se especificó un evento');
            setLoading(false);
        }
    }, [eventToken]);

    // Real-time sync: auto-refresh optimized for mobile
    useEffect(() => {
        if (!eventToken) return;

        // Refresh when page becomes visible (handles mobile wake-up)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('📱 Page visible - refreshing');
                fetchMusicByToken();
            }
        };

        // Add visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Regular polling interval
        const refreshInterval = setInterval(() => {
            if (!document.hidden) {
                fetchMusicByToken();
            }
        }, 5000); // 5 seconds

        return () => {
            clearInterval(refreshInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [eventToken]);

    const fetchMusicByToken = async () => {
        try {
            // Check for token in URL first (e.g. from a fresh QR scan)
            const urlToken = searchParams.get('token');
            if (urlToken) {
                localStorage.setItem('authToken', urlToken);
                console.log('✅ Found token in URL, updating localStorage');
            }

            const token = urlToken || getToken();
            console.log('🔑 Token for request:', token ? 'EXISTS' : 'NOT FOUND');

            const headers: HeadersInit = {};

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('✅ Setting Authorization header');
            } else {
                console.log('❌ No token found');
            }

            const response = await fetch(`/api/music/event-token/${eventToken}?t=${Date.now()}`, { headers });
            const data = await response.json();

            console.log('DEBUG Frontend - Received isAdmin from server:', data.isAdmin);

            if (!data.success) {
                setError(data.error);
                return;
            }

            console.log('🎵 Music data received:', {
                count: data.music.length,
                firstSongHasUrl: data.music[0]?.url ? 'YES' : 'NO'
            });

            setMusic(data.music);
            setEvent(data.event);
            setIsAdmin(data.isAdmin || false);
        } catch (err) {
            setError('Error al cargar la música');
        } finally {
            setLoading(false);
        }
    };

    // Dynamic search with debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        const debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await response.json();

                if (data.success) {
                    setSearchResults(data.videos);
                } else {
                    console.error('Search error:', data.error);
                    setSearchResults([]);
                }
            } catch (err) {
                console.error('Error al buscar en YouTube:', err);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const handleAddSong = async (video: YouTubeVideo) => {
        if (!event) return;

        try {
            const response = await fetch('/api/music', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idEvent: event.idEvent,
                    url: video.url,
                    title: video.title,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Refresh the entire list from server to ensure privacy
                await fetchMusicByToken();
                // Clear search results and search query
                setSearchResults([]);
                setSearchQuery('');
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al agregar canción');
        }
    };

    const handleLike = async (musicId: number) => {
        const isLiked = likedSongs.has(musicId);
        const endpoint = isLiked ? 'unlike' : 'like';

        try {
            const response = await fetch(`/api/music/${musicId}/${endpoint}`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                // Refresh from server to ensure privacy
                await fetchMusicByToken();

                if (isLiked) {
                    setLikedSongs(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(musicId);
                        return newSet;
                    });
                } else {
                    setLikedSongs(prev => new Set([...prev, musicId]));
                }
            }
        } catch (err) {
            console.error('Error al dar like');
        }
    };

    const handleDelete = async (musicId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta canción?')) {
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                alert('Debes iniciar sesión para eliminar canciones');
                return;
            }

            const response = await fetch(`/api/music/${musicId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Refresh the entire list from server
                await fetchMusicByToken();
            } else {
                alert(data.error || 'Error al eliminar la canción');
            }
        } catch (err) {
            alert('Error al eliminar la canción');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="glass-card p-8 text-center max-w-md">
                    <Music className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Error</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    {isAdmin && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl md:text-4xl font-orbitron font-bold neon-text-pink">
                                Lista de Música
                            </h1>

                            {event?.company && (
                                <div className="flex flex-col items-end gap-1">
                                    <p className="text-gray-400 font-semibold">{event.company.name}</p>
                                    <div className="flex gap-3">
                                        {event.company.urlInstagram && (
                                            <a
                                                href={event.company.urlInstagram}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-disco-pink transition-colors"
                                                title="Instagram"
                                            >
                                                <Instagram className="w-6 h-6" />
                                            </a>
                                        )}
                                        {event.company.urlFacebook && (
                                            <a
                                                href={event.company.urlFacebook}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-blue-500 transition-colors"
                                                title="Facebook"
                                            >
                                                <Facebook className="w-6 h-6" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {event && (
                            <>
                                <p className="text-xl text-white font-semibold mt-2">
                                    {event.name}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {formatDate(event.eventDate)}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Search Section */}
                <div className="glass-card p-6 mb-8 fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <Youtube className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-semibold">Buscar en YouTube</h2>
                    </div>

                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Busca canciones - resultados automáticos..."
                            className="input-neon pl-4 pr-10"
                        />
                        {searching && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-disco-pink" />
                        )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mt-6 grid gap-3">
                            {searchResults.map((video) => (
                                <div
                                    key={video.videoId}
                                    className="glass-card p-2 sm:p-3 flex flex-col gap-2 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddSong(video);
                                            }}
                                            className="p-2 sm:p-2.5 rounded-full bg-disco-pink/20 text-disco-pink hover:bg-disco-pink hover:text-white transition-all transform active:scale-95"
                                            title="Agregar a la lista"
                                        >
                                            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </button>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-[11px] sm:text-xs leading-tight mb-0.5 line-clamp-3">
                                            {video.title}
                                        </h3>
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">{video.channelTitle}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Music List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-orbitron font-bold">
                            Playlist
                            <span className="ml-3 text-lg text-gray-400 font-normal">
                                ({music.length} canciones)
                            </span>
                        </h2>
                    </div>

                    {music.length === 0 ? (
                        <div className="text-center py-16 glass-card">
                            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-xl text-gray-400">No hay música en esta lista</p>
                            <p className="text-gray-500 mt-2">Usa la búsqueda para agregar canciones</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {music
                                .sort((a, b) => b.likes - a.likes)
                                .map((song, index) => (
                                    <div
                                        key={song.idEventMusic}
                                        className="music-card p-5 flex flex-col gap-4 stagger-item"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        {/* Title Row - Full width */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-disco-purple/30 border border-disco-purple/50 flex items-center justify-center font-orbitron text-xs font-bold text-disco-pink">
                                                #{song.number}
                                            </div>
                                            <h3 className="text-lg font-bold font-orbitron leading-tight break-words flex-1 text-white">
                                                {song.title}
                                            </h3>

                                        </div>

                                        {/* Actions/Info Row */}
                                        <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                            <div className="flex items-center gap-3">
                                                {isAdmin && song.url && (
                                                    <a
                                                        href={song.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-disco-cyan hover:text-disco-cyan/80 transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        YouTube
                                                    </a>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Like Button */}
                                                <button
                                                    onClick={() => handleLike(song.idEventMusic)}
                                                    className={`like-btn flex items-center gap-2 px-4 py-1.5 rounded-full transition text-sm ${likedSongs.has(song.idEventMusic)
                                                        ? 'bg-disco-pink text-white liked shadow-[0_0_15px_-3px_rgba(255,0,128,0.5)]'
                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                                        }`}
                                                >
                                                    <Heart
                                                        className={`w-4 h-4 ${likedSongs.has(song.idEventMusic) ? 'fill-current' : ''
                                                            }`}
                                                    />
                                                    <span className="font-bold">{song.likes}</span>
                                                </button>

                                                {/* Delete Button - Only show if Admin */}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete(song.idEventMusic)}
                                                        className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30"
                                                        title="Eliminar canción"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
