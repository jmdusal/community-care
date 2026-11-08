import { describe, expect, it } from 'vitest';
import { formatRange, openNow } from './hours';

// 2026-11-09 is a Monday. 02:00 UTC = 10:00 Manila; 15:00 UTC = 23:00 Manila; 20:00 UTC Monday = 04:00 Tuesday Manila.
const at = (iso: string) => new Date(iso);

describe('opening hours', () => {
  it('formats 24-hour and overnight ranges', () => {
    expect(formatRange('00:00', '24:00')).toBe('Open 24 hours');
    expect(formatRange('08:00', '17:00')).toBe('8:00 AM – 5:00 PM');
    expect(formatRange('22:00', '06:00')).toBe('10:00 PM – 6:00 AM (next day)');
  });

  it('knows when a facility is open, including overnight and special days', () => {
    const weekdays = [{ day_of_week: 1, opens_at: '08:00', closes_at: '17:00' }];
    expect(openNow(weekdays, [], at('2026-11-09T02:00:00Z'))).toBe(true);
    expect(openNow(weekdays, [], at('2026-11-09T15:00:00Z'))).toBe(false);

    const nights = [{ day_of_week: 1, opens_at: '22:00', closes_at: '06:00' }];
    expect(openNow(nights, [], at('2026-11-09T15:00:00Z'))).toBe(true);
    expect(openNow(nights, [], at('2026-11-09T20:00:00Z'))).toBe(true);

    const holiday = [{ date: '2026-11-09', is_closed: true, opens_at: null, closes_at: null, reason: 'Holiday' }];
    expect(openNow(weekdays, holiday, at('2026-11-09T02:00:00Z'))).toBe(false);
    expect(openNow([], [], at('2026-11-09T02:00:00Z'))).toBeNull();
  });
});
