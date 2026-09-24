import {
  brazilMonthRange,
  brazilTodayIso,
  getBrazilYearMonth,
  parseCivilDateTime,
  parseDateOnly,
  toDateOnlyIso,
} from './date-range';

describe('date-range helpers', () => {
  it('parseDateOnly keeps the civil day for yyyy-MM-dd', () => {
    const date = parseDateOnly('2026-03-15');
    expect(toDateOnlyIso(date)).toBe('2026-03-15');
  });

  it('toDateOnlyIso does not shift UTC midnight dates', () => {
    expect(toDateOnlyIso(new Date('2026-03-15T00:00:00.000Z'))).toBe('2026-03-15');
  });

  it('parseCivilDateTime uses Brazil midnight for date-only values', () => {
    const date = parseCivilDateTime('2026-03-15');
    expect(date.toISOString()).toBe('2026-03-15T03:00:00.000Z');
  });

  it('getBrazilYearMonth uses America/Sao_Paulo calendar', () => {
    const lateEveningUtc = new Date('2026-04-01T02:30:00.000Z');
    expect(getBrazilYearMonth(lateEveningUtc)).toEqual({ year: 2026, month: 3 });
  });

  it('brazilMonthRange covers the full Brazil civil month', () => {
    const { from, to } = brazilMonthRange(2026, 3);
    expect(from.toISOString()).toBe('2026-03-01T03:00:00.000Z');
    expect(to.toISOString()).toBe('2026-04-01T03:00:00.000Z');
  });

  it('brazilTodayIso follows America/Sao_Paulo', () => {
    expect(brazilTodayIso(new Date('2026-03-15T02:00:00.000Z'))).toBe('2026-03-14');
    expect(brazilTodayIso(new Date('2026-03-15T03:00:00.000Z'))).toBe('2026-03-15');
  });
});
