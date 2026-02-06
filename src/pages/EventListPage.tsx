import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Plus,
    Calendar,
    MapPin,
    QrCode,
    Edit2,
    Trash2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Search
} from 'lucide-react';
import QRCodeModal from '../components/QRCodeModal';
import EventForm from '../components/EventForm';

interface Event {
    idEvent: number;
    idCompany: number;
    name: string;
    creationDate: string;
    eventDate: string;
    active: boolean;
    eventToken: string;
    positionLongitud: number | null;
    positionLatitud: number | null;
    company?: {
        name: string;
        keyCompany: string;
        url: string;
    };
}

interface Company {
    idCompany: number;
    name: string;
    keyCompany: string;
    url?: string;
    urlImagen?: string;
}

export default function EventListPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [qrEvent, setQrEvent] = useState<{ url: string; event: Event } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const company: Company | undefined = location.state?.company;
    const token: string | undefined = location.state?.token;

    // Save token to localStorage if it exists in location state
    useEffect(() => {
        if (token) {
            console.log('💾 Saving token to localStorage from navigation state');
            localStorage.setItem('authToken', token);
        }
    }, [token]);

    useEffect(() => {
        if (company) {
            fetchEvents();
        } else {
            setError('No se especificó una compañía');
            setLoading(false);
        }
    }, [company]);

    const fetchEvents = async () => {
        if (!company) return;

        try {
            const response = await fetch(`/api/events/company/${company.idCompany}`);
            const data = await response.json();

            if (!data.success) {
                setError(data.error);
                return;
            }

            setEvents(data.events);
        } catch (err) {
            setError('Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (eventData: Partial<Event>) => {
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idCompany: company?.idCompany,
                    ...eventData,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setEvents(prev => [data.event, ...prev]);
                setShowForm(false);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al crear evento');
        }
    };

    const handleUpdateEvent = async (eventData: Partial<Event>) => {
        if (!editingEvent) return;

        try {
            const response = await fetch(`/api/events/${editingEvent.idEvent}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
            });

            const data = await response.json();

            if (data.success) {
                setEvents(prev => prev.map(e =>
                    e.idEvent === editingEvent.idEvent ? data.event : e
                ));
                setEditingEvent(null);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al actualizar evento');
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!confirm('¿Está seguro de eliminar este evento?')) return;

        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                setEvents(prev => prev.filter(e => e.idEvent !== eventId));
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al eliminar evento');
        }
    };

    const handleShowQR = async (event: Event) => {
        try {
            const response = await fetch(`/api/events/${event.idEvent}/qr-data`);
            const data = await response.json();

            if (data.success) {
                setQrEvent({ url: data.qrData, event });
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error al generar código QR');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatShortDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const isEventActive = (eventDate: string) => {
        const date = new Date(eventDate);
        const now = new Date();
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        return diffHours <= 12;
    };

    // Filter events based on search query
    const filteredEvents = events.filter(event => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const eventName = event.name.toLowerCase();
        const eventDate = formatDate(event.eventDate).toLowerCase();
        return eventName.includes(query) || eventDate.includes(query);
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-orbitron font-bold neon-text-purple">
                                Eventos
                            </h1>
                            {company && (
                                <p className="text-gray-400 mt-1">{company.name}</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-neon flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Nuevo Evento</span>
                    </button>
                </div>

                {error && (
                    <div className="glass-card p-4 mb-6 border-red-500/30 text-red-400">
                        {error}
                    </div>
                )}

                {/* Search Bar */}
                <div className="glass-card p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre o fecha..."
                            className="input-neon pl-12"
                        />
                    </div>
                </div>

                {/* Events Table */}
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Estado</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Nombre</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Fecha del Evento</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Fecha Creación</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Ubicación</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Token</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.map((event, _index) => (
                                    <tr
                                        key={event.idEvent}
                                        className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                                        onClick={() => navigate(`/music/${event.eventToken}`)}
                                    >
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs w-fit ${event.active && isEventActive(event.eventDate)
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {event.active && isEventActive(event.eventDate) ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3" />
                                                        Activo
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3 h-3" />
                                                        Expirado
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* Name */}
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-white">{event.name}</span>
                                        </td>

                                        {/* Event Date */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-disco-purple" />
                                                <span>{formatDate(event.eventDate)}</span>
                                            </div>
                                        </td>

                                        {/* Creation Date */}
                                        <td className="px-4 py-3 text-sm text-gray-400">
                                            {formatShortDate(event.creationDate)}
                                        </td>

                                        {/* Location */}
                                        <td className="px-4 py-3">
                                            {(event.positionLatitud || event.positionLongitud) ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${event.positionLatitud},${event.positionLongitud}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-disco-pink transition-colors z-10 relative"
                                                >
                                                    <MapPin className="w-4 h-4 text-disco-pink" />
                                                    <span className="hover:underline">
                                                        {event.positionLatitud?.toFixed(2)}, {event.positionLongitud?.toFixed(2)}
                                                    </span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-500 text-sm">—</span>
                                            )}
                                        </td>

                                        {/* Token */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
                                                {event.eventToken.substring(0, 8)}...
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShowQR(event);
                                                    }}
                                                    className="p-2 rounded-lg bg-disco-cyan/20 hover:bg-disco-cyan/30 text-disco-cyan transition"
                                                    title="Código QR"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingEvent(event);
                                                    }}
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteEvent(event.idEvent);
                                                    }}
                                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredEvents.length === 0 && !loading && (
                        <div className="text-center py-16">
                            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-xl text-gray-400">
                                {searchQuery ? 'No se encontraron eventos' : 'No hay eventos'}
                            </p>
                            <p className="text-gray-500 mt-2">
                                {searchQuery ? 'Intenta con otro término de búsqueda' : 'Crea tu primer evento para comenzar'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Event Form Modal */}
            {(showForm || editingEvent) && (
                <EventForm
                    event={editingEvent}
                    onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
                    onClose={() => {
                        setShowForm(false);
                        setEditingEvent(null);
                    }}
                />
            )}

            {/* QR Code Modal */}
            {qrEvent && (
                <QRCodeModal
                    url={qrEvent.url}
                    eventToken={qrEvent.event.eventToken}
                    eventName={qrEvent.event.name}
                    onClose={() => setQrEvent(null)}
                />
            )}
        </div>
    );
}
