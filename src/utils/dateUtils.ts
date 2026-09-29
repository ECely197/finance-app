/**
 * Centralized Colombian Date Utility (America/Bogota - UTC-5)
 *
 * Solves the critical timezone issue where transactions after 7:00 PM (UTC-5)
 * shifted to tomorrow because of `.toISOString().split('T')[0]`, or shifted backwards
 * due to `new Date('YYYY-MM-DD')` parsing as UTC midnight.
 */

export const BOGOTA_TIMEZONE = 'America/Bogota';

// Fast Intl formatter configured specifically for Colombia (en-CA outputs YYYY-MM-DD)
const bogotaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns current date in Colombia as YYYY-MM-DD string.
 * Example: "2026-09-28" (even past 7:00 PM local time).
 */
export const getTodayColombia = (): string => {
  return bogotaDateFormatter.format(new Date());
};

/**
 * Converts any Date object, Firestore Timestamp ({ toDate() } or { seconds }),
 * timestamp number, or string to YYYY-MM-DD in America/Bogota timezone.
 */
export const formatToColombiaDate = (
  dateInput?: Date | { toDate?: () => Date; seconds?: number } | string | number | null
): string => {
  if (!dateInput) return getTodayColombia();

  if (typeof dateInput === 'string') {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
  }

  let d: Date;
  if (typeof dateInput === 'object' && dateInput !== null) {
    if (typeof (dateInput as any).toDate === 'function') {
      d = (dateInput as any).toDate();
    } else if ('seconds' in (dateInput as any) && typeof (dateInput as any).seconds === 'number') {
      d = new Date((dateInput as any).seconds * 1000);
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      d = new Date(dateInput as any);
    }
  } else {
    d = new Date(dateInput as any);
  }

  if (isNaN(d.getTime())) {
    return getTodayColombia();
  }

  return bogotaDateFormatter.format(d);
};

/**
 * Safely parses a YYYY-MM-DD string to a Date object set at 12:00:00 (noon).
 * NEVER use new Date('YYYY-MM-DD') directly because JavaScript treats it as
 * UTC midnight, which in Colombia (UTC-5) shifts to 7:00 PM of the PREVIOUS day.
 */
export const parseSafeDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

/**
 * Extracts current time parts (hours, minutes, seconds) in Colombia timezone.
 */
export const getColombiaTimeParts = (d: Date = new Date()): { hours: number; minutes: number; seconds: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(d);

  const hours = Number(parts.find(p => p.type === 'hour')?.value ?? 12);
  const minutes = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
  const seconds = Number(parts.find(p => p.type === 'second')?.value ?? 0);

  return { hours, minutes, seconds };
};

/**
 * Creates a Date instance representing a specific YYYY-MM-DD in Colombia timezone.
 * Defaults to the current Colombia local hour/minute/second, or specified hours.
 * Uses the exact UTC-5 offset (-05:00) so that Firestore timestamps preserve the exact day.
 */
export const createColombiaDateTime = (
  dateString: string,
  customHours?: number,
  customMinutes?: number,
  customSeconds?: number
): Date => {
  if (!dateString) return new Date();
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const y = Number(yearStr);
  const m = Number(monthStr);
  const d = Number(dayStr);

  const time = getColombiaTimeParts();
  const h = customHours !== undefined ? customHours : time.hours;
  const min = customMinutes !== undefined ? customMinutes : time.minutes;
  const s = customSeconds !== undefined ? customSeconds : time.seconds;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isoWithOffset = `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}.000-05:00`;
  const result = new Date(isoWithOffset);
  return isNaN(result.getTime()) ? new Date(y, m - 1, d, h, min, s) : result;
};

/**
 * Generates exact Date bounds and ISO strings for filtering in DashboardView & TransactionsView.
 * Every boundary is locked to Colombia time (UTC-5) from 00:00:00.000 to 23:59:59.999.
 */
export const getColombiaRangeBounds = (
  range: string,
  customStart?: string,
  customEnd?: string
): { start: Date | null; end: Date | null; startStr: string; endStr: string } => {
  const todayStr = getTodayColombia(); // e.g. "2026-09-28"
  const [year, month, day] = todayStr.split('-').map(Number);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const makeStartOfDay = (y: number, m: number, d: number): Date => {
    return new Date(`${y}-${pad(m)}-${pad(d)}T00:00:00.000-05:00`);
  };

  const makeEndOfDay = (y: number, m: number, d: number): Date => {
    return new Date(`${y}-${pad(m)}-${pad(d)}T23:59:59.999-05:00`);
  };

  let start: Date | null = null;
  let end: Date | null = null;

  switch (range) {
    case 'today': {
      start = makeStartOfDay(year, month, day);
      end = makeEndOfDay(year, month, day);
      break;
    }
    case 'last_7_days': {
      // 7 days total including today in Colombia
      const tempDate = new Date(year, month - 1, day);
      tempDate.setDate(tempDate.getDate() - 6);
      start = makeStartOfDay(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
      end = makeEndOfDay(year, month, day);
      break;
    }
    case 'this_month': {
      start = makeStartOfDay(year, month, 1);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      end = makeEndOfDay(year, month, lastDayOfMonth);
      break;
    }
    case 'last_month': {
      const prevMonthYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      const lastDayOfPrevMonth = new Date(prevMonthYear, prevMonth, 0).getDate();
      start = makeStartOfDay(prevMonthYear, prevMonth, 1);
      end = makeEndOfDay(prevMonthYear, prevMonth, lastDayOfPrevMonth);
      break;
    }
    case 'custom': {
      if (customStart && customEnd) {
        const [sy, sm, sd] = customStart.split('-').map(Number);
        const [ey, em, ed] = customEnd.split('-').map(Number);
        start = makeStartOfDay(sy, sm, sd);
        end = makeEndOfDay(ey, em, ed);
      }
      break;
    }
    case 'all':
    default: {
      start = null;
      end = null;
      break;
    }
  }

  return {
    start,
    end,
    startStr: start ? start.toISOString() : '',
    endStr: end ? end.toISOString() : '',
  };
};

/**
 * Formats a Date / Timestamp to a friendly string: "28 sep • 07:30 p. m." in Colombia time.
 */
export const formatColombiaDateTimeDisplay = (dateObj: any): string => {
  if (!dateObj) return '';
  const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj.seconds ? dateObj.seconds * 1000 : dateObj);
  if (isNaN(d.getTime())) return '';

  const datePart = d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: BOGOTA_TIMEZONE,
  });

  const timePart = d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: BOGOTA_TIMEZONE,
  });

  return `${datePart} • ${timePart}`;
};

/**
 * Formats a Date / Timestamp to a short day: "28 sep" in Colombia time.
 */
export const formatColombiaShort = (dateObj: any): string => {
  if (!dateObj) return '';
  const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj.seconds ? dateObj.seconds * 1000 : dateObj);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: BOGOTA_TIMEZONE,
  });
};
