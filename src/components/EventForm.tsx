import { useState } from 'react';
import { X, Calendar, MapPin, Save, Loader2, Type } from 'lucide-react';

interface Event {
    idEvent: number;
    name: string;
    eventDate: string;
    positionLongitud: number | null;
    positionLatitud: number | null;
    active: boolean;
}

interface EventFormProps {
    event?: Event | null;
    onSubmit: (data: Partial<Event>) => Promise<void>;
    onClose: () => void;
}

export default function EventForm({ event, onSubmit, onClose }: EventFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: event?.name || '',
        eventDate: event?.eventDate
            ? new Date(event.eventDate).toISOString().slice(0, 16)
            : '',
        positionLatitud: event?.positionLatitud?.toString() || '',
        positionLongitud: event?.positionLongitud?.toString() || '',
        active: event?.active ?? true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre del evento es requerido';
        } else if (formData.name.length > 50) {
            newErrors.name = 'El nombre no puede exceder 50 caracteres';
        }

        if (!formData.eventDate) {
            newErrors.eventDate = 'La fecha del evento es requerida';
        } else {
            const eventDate = new Date(formData.eventDate);
            if (isNaN(eventDate.getTime())) {
                newErrors.eventDate = 'Fecha inválida';
            }
        }

        if (formData.positionLatitud) {
            const lat = parseFloat(formData.positionLatitud);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                newErrors.positionLatitud = 'Latitud debe estar entre -90 y 90';
            }
        }

        if (formData.positionLongitud) {
            const lng = parseFloat(formData.positionLongitud);
            if (isNaN(lng) || lng < -180 || lng > 180) {
                newErrors.positionLongitud = 'Longitud debe estar entre -180 y 180';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                eventDate: formData.eventDate,
                positionLatitud: formData.positionLatitud ? parseFloat(formData.positionLatitud) : null,
                positionLongitud: formData.positionLongitud ? parseFloat(formData.positionLongitud) : null,
                active: formData.active,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocalización no soportada');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    positionLatitud: position.coords.latitude.toString(),
                    positionLongitud: position.coords.longitude.toString(),
                }));
            },
            (error) => {
                alert('Error al obtener ubicación: ' + error.message);
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md p-6 fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-orbitron font-bold">
                        {event ? 'Editar Evento' : 'Nuevo Evento'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Event Name */}
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <Type className="w-4 h-4" />
                            Nombre del Evento *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Fiesta de Año Nuevo"
                            maxLength={50}
                            className="input-neon"
                        />
                        {errors.name && (
                            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Event Date */}
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            Fecha y Hora del Evento *
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.eventDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                            className="input-neon"
                        />
                        {errors.eventDate && (
                            <p className="text-red-400 text-sm mt-1">{errors.eventDate}</p>
                        )}
                    </div>

                    {/* Location */}
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <MapPin className="w-4 h-4" />
                            Ubicación (opcional)
                        </label>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div>
                                <input
                                    type="text"
                                    value={formData.positionLatitud}
                                    onChange={(e) => setFormData(prev => ({ ...prev, positionLatitud: e.target.value }))}
                                    placeholder="Latitud"
                                    className="input-neon"
                                />
                                {errors.positionLatitud && (
                                    <p className="text-red-400 text-xs mt-1">{errors.positionLatitud}</p>
                                )}
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={formData.positionLongitud}
                                    onChange={(e) => setFormData(prev => ({ ...prev, positionLongitud: e.target.value }))}
                                    placeholder="Longitud"
                                    className="input-neon"
                                />
                                {errors.positionLongitud && (
                                    <p className="text-red-400 text-xs mt-1">{errors.positionLongitud}</p>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGetLocation}
                            className="text-sm text-disco-cyan hover:underline flex items-center gap-1"
                        >
                            <MapPin className="w-3 h-3" />
                            Usar mi ubicación actual
                        </button>
                    </div>

                    {/* Active Status */}
                    {event && (
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                className="w-5 h-5 rounded border-disco-purple bg-transparent"
                            />
                            <label htmlFor="active" className="text-gray-300">
                                Evento activo
                            </label>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-neon flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
