import { useState } from 'react';
import { X, Calendar, MapPin, Save, Loader2, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
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
            newErrors.name = t('eventForm.error_name_required');
        } else if (formData.name.length > 50) {
            newErrors.name = t('eventForm.error_name_length');
        }

        if (!formData.eventDate) {
            newErrors.eventDate = t('eventForm.error_date_required');
        } else {
            const eventDate = new Date(formData.eventDate);
            if (isNaN(eventDate.getTime())) {
                newErrors.eventDate = t('eventForm.error_date_invalid');
            }
        }

        if (formData.positionLatitud) {
            const lat = parseFloat(formData.positionLatitud);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                newErrors.positionLatitud = t('eventForm.error_lat_invalid');
            }
        }

        if (formData.positionLongitud) {
            const lng = parseFloat(formData.positionLongitud);
            if (isNaN(lng) || lng < -180 || lng > 180) {
                newErrors.positionLongitud = t('eventForm.error_lng_invalid');
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
            alert(t('eventForm.error_geo_notsupported'));
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
                alert(t('eventForm.error_geo_failed') + error.message);
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md p-6 fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-orbitron font-bold">
                        {event ? t('eventForm.title_edit') : t('eventForm.title_new')}
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
                            {t('eventForm.label_name')}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('eventForm.placeholder_name')}
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
                            {t('eventForm.label_date')}
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
                            {t('eventForm.label_location')}
                        </label>

                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div>
                                <input
                                    type="text"
                                    value={formData.positionLatitud}
                                    onChange={(e) => setFormData(prev => ({ ...prev, positionLatitud: e.target.value }))}
                                    placeholder={t('eventForm.placeholder_lat')}
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
                                    placeholder={t('eventForm.placeholder_lng')}
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
                            {t('eventForm.use_current_location')}
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
                                {t('eventForm.active_event')}
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            {t('eventForm.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 btn-neon flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('eventForm.saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {t('eventForm.save')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
