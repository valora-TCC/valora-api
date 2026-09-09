const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Civil-day bounds in America/Sao_Paulo (no DST since 2019). */
const APP_TZ_OFFSET = '-03:00';

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
