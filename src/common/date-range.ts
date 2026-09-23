const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Civil-day bounds in America/Sao_Paulo (no DST since 2019). */
const APP_TZ_OFFSET = '-03:00';
const APP_TIME_ZONE = 'America/Sao_Paulo';

/**
 * Parses API date filters. Date-only (`yyyy-MM-dd`) is treated as an inclusive
 * calendar day in America/Sao_Paulo so evening transactions are not cut off
 * by UTC midnight.
 */
export function parseRangeStart(value: string): Date {
  if (DATE_ONLY.test(value)) {
    return new Date(`${value}T00:00:00.000${APP_TZ_OFFSET}`);
  }
  return new Date(value);
}

export function parseRangeEnd(value: string): Date {
  if (DATE_ONLY.test(value)) {
    return new Date(`${value}T23:59:59.999${APP_TZ_OFFSET}`);
  }
  return new Date(value);
}

/**
 * Parses a calendar date for `@db.Date` columns.
 * Uses noon UTC so the civil day stays stable across Brazil local formatting.
 */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12));
  }
  if (DATE_ONLY.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12));
}

/** Formats a `@db.Date` / UTC-midnight value as `yyyy-MM-dd`. */
export function toDateOnlyIso(value: Date | string): string {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

/**
 * Parses Belvo-style date-only strings as the start of that civil day in
 * America/Sao_Paulo (for Timestamptz fields).
 */
export function parseCivilDateTime(value?: string | null): Date {
  if (!value) return new Date();
  if (DATE_ONLY.test(value)) {
    return new Date(`${value}T00:00:00.000${APP_TZ_OFFSET}`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Today's calendar date in America/Sao_Paulo as `yyyy-MM-dd`. */
export function brazilTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Calendar year/month in America/Sao_Paulo. */
export function getBrazilYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return { year, month };
}

/** Inclusive Brazil civil-month bounds for Timestamptz queries. */
export function brazilMonthRange(ano: number, mes: number): { from: Date; to: Date } {
  const start = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const nextMonth = mes === 12 ? 1 : mes + 1;
  const nextYear = mes === 12 ? ano + 1 : ano;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return {
    from: parseRangeStart(start),
    to: parseRangeStart(endExclusive),
  };
}
