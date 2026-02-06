import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addHours, isAfter, isBefore } from 'date-fns';

const TIMEZONE = 'America/Mexico_City'; // UTC-6

/**
 * Get current date in UTC-6 timezone
 */
export function getCurrentDateUTC6(): Date {
    return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Convert UTC date to UTC-6 timezone
 */
export function toUTC6(date: Date): Date {
    return toZonedTime(date, TIMEZONE);
}

/**
 * Convert UTC-6 date to UTC for database storage
 */
export function fromUTC6(date: Date): Date {
    return fromZonedTime(date, TIMEZONE);
}

/**
 * Check if date is within N hours from now
 */
export function isWithinHours(date: Date, hours: number): boolean {
    const now = getCurrentDateUTC6();
    const dateInZone = toUTC6(date);
    const limitDate = addHours(dateInZone, hours);
    return isBefore(now, limitDate);
}

/**
 * Check if a date is expired (more than N hours ago)
 */
export function isExpired(date: Date, hours: number): boolean {
    const now = getCurrentDateUTC6();
    const dateInZone = toUTC6(date);
    const expiryDate = addHours(dateInZone, hours);
    return isAfter(now, expiryDate);
}

/**
 * Format date for display in UTC-6
 */
export function formatDateUTC6(date: Date): string {
    const zonedDate = toZonedTime(date, TIMEZONE);
    return zonedDate.toLocaleString('es-MX', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}
