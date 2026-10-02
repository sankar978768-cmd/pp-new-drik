import { DayOfWeek, PakshaType } from '../types';
import { getLunarDayInfo } from './lunarCalendar';
import { calculateSolarTimes } from './solarCalculator';

export const IST_OFFSET_MINUTES = 330; // +05:30 = 330 minutes

export type TimeDisplayMode = 'local' | 'ist';

export interface LocationTimezoneInfo {
  offsetMinutes: number;
  tzAbbreviation: string;
  isOtherLocation: boolean;
  timeDifferenceText: string;
}

/**
 * Calculates current timezone offset in minutes for a given location.
 * Uses native Intl.DateTimeFormat with IANA timezone if available,
 * or falls back to known timezoneOffset or longitude approximation.
 */
export function getTimezoneOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    const year = getVal('year');
    const month = getVal('month') - 1;
    const day = getVal('day');
    let hour = getVal('hour');
    if (hour === 24) hour = 0;
    const minute = getVal('minute');
    const second = getVal('second');
    const tzAsUtc = Date.UTC(year, month, day, hour, minute, second);
    return Math.round((tzAsUtc - date.getTime()) / 60000);
  } catch {
    return IST_OFFSET_MINUTES;
  }
}

export function getLocationTimezoneInfo(location: {
  lat: number;
  lng: number;
  timezone?: string;
  timezoneOffset?: number;
}): LocationTimezoneInfo {
  let offsetMinutes = IST_OFFSET_MINUTES;
  let tzAbbreviation = 'IST';

  const now = new Date();

  // 1. Try using IANA timezone identifier with native Intl API
  if (location.timezone) {
    try {
      offsetMinutes = getTimezoneOffsetMinutes(location.timezone, now);

      // Get short timezone abbreviation (e.g. EDT, GMT, SGT, IST)
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: location.timezone,
        timeZoneName: 'short',
      });
      const parts = formatter.formatToParts(now);
      const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
      if (tzPart) {
        tzAbbreviation = tzPart;
      }
    } catch {
      // Fallback below
    }
  } else if (typeof location.timezoneOffset === 'number') {
    // 2. Use numerical timezoneOffset hours (e.g. 5.5, -5, 8, 4)
    offsetMinutes = Math.round(location.timezoneOffset * 60);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absHrs = Math.floor(Math.abs(offsetMinutes) / 60);
    const absMins = Math.abs(offsetMinutes) % 60;
    tzAbbreviation = absMins > 0 ? `UTC${sign}${absHrs}:${absMins}` : `UTC${sign}${absHrs}`;
  } else {
    // 3. Check if coordinate falls inside India geographic boundaries
    if (location.lat >= 6 && location.lat <= 38 && location.lng >= 68 && location.lng <= 98) {
      offsetMinutes = IST_OFFSET_MINUTES;
      tzAbbreviation = 'IST';
    } else {
      // Longitude-based solar approximate timezone
      const approxHours = Math.round((location.lng / 15) * 2) / 2;
      offsetMinutes = Math.round(approxHours * 60);
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const absHrs = Math.floor(Math.abs(offsetMinutes) / 60);
      const absMins = Math.abs(offsetMinutes) % 60;
      tzAbbreviation = absMins > 0 ? `UTC${sign}${absHrs}:${absMins}` : `UTC${sign}${absHrs}`;
    }
  }

  // Check if this location is outside IST (+330 min)
  const isOtherLocation = Math.abs(offsetMinutes - IST_OFFSET_MINUTES) > 15;

  // Compute time difference relative to IST
  const diffFromIST = offsetMinutes - IST_OFFSET_MINUTES;
  const diffHours = Math.floor(Math.abs(diffFromIST) / 60);
  const diffMins = Math.abs(diffFromIST) % 60;
  const diffSign = diffFromIST >= 0 ? '+' : '-';
  const diffStr = diffFromIST === 0
    ? 'Same as IST'
    : `${diffSign}${diffHours}h${diffMins > 0 ? ` ${diffMins}m` : ''} from IST`;

  return {
    offsetMinutes,
    tzAbbreviation,
    isOtherLocation,
    timeDifferenceText: diffStr,
  };
}

/**
 * Calculates the exact local date, calendar day of week, and local minutes from midnight
 * in the target location's timezone.
 */
export function getTargetLocationCurrentMoment(
  targetOffsetMinutes: number,
  refDate: Date = new Date()
): {
  localDate: Date;
  dayOfWeek: DayOfWeek;
  localMinutesFromMidnight: number;
  localTimeHHMM: string;
  paksha: PakshaType;
} {
  // Target location timestamp in milliseconds:
  // refDate.getTime() is ALREADY UTC epoch timestamp in milliseconds.
  const targetMs = refDate.getTime() + targetOffsetMinutes * 60000;
  const targetDate = new Date(targetMs);

  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[targetDate.getUTCDay()];

  const localHours = targetDate.getUTCHours();
  const localMins = targetDate.getUTCMinutes();
  const localMinutesFromMidnight = localHours * 60 + localMins;
  const localTimeHHMM = `${localHours.toString().padStart(2, '0')}:${localMins.toString().padStart(2, '0')}`;

  // Local calendar date in the target location
  const localDate = new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());

  // Lunar information & Paksha calculated strictly for the target location's local calendar date
  const lunar = getLunarDayInfo(localDate);

  return {
    localDate,
    dayOfWeek,
    localMinutesFromMidnight,
    localTimeHHMM,
    paksha: lunar.paksha,
  };
}

/**
 * Shifts a HH:MM 24h timestamp by a number of minutes (modulo 1440).
 */
export function shiftTimeHHMM(timeHHMM: string, shiftMinutes: number): string {
  if (!timeHHMM || !timeHHMM.includes(':')) return timeHHMM;
  const [hStr, mStr] = timeHHMM.split(':');
  const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + shiftMinutes;
  let normalized = totalMin % 1440;
  if (normalized < 0) normalized += 1440;
  const h = Math.floor(normalized / 60);
  const m = Math.round(normalized % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Computes solar times for a target location in its local time.
 */
export function computeTargetSolarTimes(
  lat: number,
  lng: number,
  localDate: Date,
  targetOffsetMinutes: number
): { sunrise: string; sunset: string; nextSunrise: string } {
  return calculateSolarTimes(lat, lng, localDate, targetOffsetMinutes);
}

/**
 * Computes the time conversion between target local time and IST.
 * Shift from Local Time to IST is (IST_OFFSET_MINUTES - targetOffsetMinutes).
 */
export function getLocalToISTShiftMinutes(targetOffsetMinutes: number): number {
  return IST_OFFSET_MINUTES - targetOffsetMinutes;
}
