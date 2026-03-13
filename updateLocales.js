const fs = require('fs');
const enPath = './src/locales/en/translation.json';
const esPath = './src/locales/es/translation.json';

const enFile = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const esFile = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const enNew = {
  qrCode: {
    error_copy_url: "Error copying URL",
    title: "QR Code",
    event_label: "Event",
    event_url: "Event URL",
    copied: "Copied!",
    copy_url: "Copy URL",
    download: "Download"
  },
  youtubeSearch: {
    view_on_youtube: "View on YouTube",
    add_to_playlist: "Add to playlist"
  },
  eventForm: {
    error_name_required: "Event name is required",
    error_name_length: "Event name cannot exceed 50 characters",
    error_date_required: "Event date is required",
    error_date_invalid: "Invalid date",
    error_lat_invalid: "Latitude must be between -90 and 90",
    error_lng_invalid: "Longitude must be between -180 and 180",
    error_geo_notsupported: "Geolocation is not supported",
    error_geo_failed: "Error getting location: ",
    title_edit: "Edit Event",
    title_new: "New Event",
    label_name: "Event Name *",
    placeholder_name: "E.g., New Year's Party",
    label_date: "Event Date and Time *",
    label_location: "Location (optional)",
    placeholder_lat: "Latitude",
    placeholder_lng: "Longitude",
    use_current_location: "Use my current location",
    active_event: "Active event",
    cancel: "Cancel",
    saving: "Saving...",
    save: "Save"
  }
};

const esNew = {
  qrCode: {
    error_copy_url: "Error al copiar URL",
    title: "Código QR",
    event_label: "Evento",
    event_url: "URL del Evento",
    copied: "¡Copiado!",
    copy_url: "Copiar URL",
    download: "Descargar"
  },
  youtubeSearch: {
    view_on_youtube: "Ver en YouTube",
    add_to_playlist: "Agregar a la playlist"
  },
  eventForm: {
    error_name_required: "El nombre del evento es requerido",
    error_name_length: "El nombre no puede exceder 50 caracteres",
    error_date_required: "La fecha del evento es requerida",
    error_date_invalid: "Fecha inválida",
    error_lat_invalid: "Latitud debe estar entre -90 y 90",
    error_lng_invalid: "Longitud debe estar entre -180 y 180",
    error_geo_notsupported: "Geolocalización no soportada",
    error_geo_failed: "Error al obtener ubicación: ",
    title_edit: "Editar Evento",
    title_new: "Nuevo Evento",
    label_name: "Nombre del Evento *",
    placeholder_name: "Ej: Fiesta de Año Nuevo",
    label_date: "Fecha y Hora del Evento *",
    label_location: "Ubicación (opcional)",
    placeholder_lat: "Latitud",
    placeholder_lng: "Longitud",
    use_current_location: "Usar mi ubicación actual",
    active_event: "Evento activo",
    cancel: "Cancelar",
    saving: "Guardando...",
    save: "Guardar"
  }
};

Object.assign(enFile, enNew);
Object.assign(esFile, esNew);

fs.writeFileSync(enPath, JSON.stringify(enFile, null, 2));
fs.writeFileSync(esPath, JSON.stringify(esFile, null, 2));

console.log('Locales updated!');
