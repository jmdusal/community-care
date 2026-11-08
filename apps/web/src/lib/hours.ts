/**
 * Opening-hours helpers shared by the public pages. Times are Philippine time, "HH:MM".
 * 00:00–24:00 means open 24 hours; a closing time earlier than the opening time runs
 * past midnight (22:00–06:00).
 */
export type WeeklyHour = { day_of_week: number; opens_at: string; closes_at: string };
export type SpecialDay = { date: string; is_closed: boolean; opens_at: string | null; closes_at: string | null; reason: string | null };

export function isAllDay(hour: { opens_at: string | null; closes_at: string | null }): boolean {
  return hour.opens_at === '00:00' && hour.closes_at === '24:00';
}

/** "Open 24 hours", "8:00 AM – 5:00 PM", "10:00 PM – 6:00 AM (next day)". */
export function formatRange(opens: string, closes: string): string {
  if (opens === '00:00' && closes === '24:00') {
    return 'Open 24 hours';
  }

  return `${clock(opens)} – ${clock(closes)}${closes < opens ? ' (next day)' : ''}`;
}

function clock(time: string): string {
  if (time === '24:00') {
    return '12:00 AM';
  }
  const [h, m] = time.split(':').map(Number);

  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Now in Philippine time: ISO weekday (1 = Monday), "YYYY-MM-DD" and "HH:MM". */
export function manilaNow(now = new Date()): { day: number; date: string; time: string } {
  const zone = { timeZone: 'Asia/Manila' } as const;
  const weekday = now.toLocaleDateString('en-US', { ...zone, weekday: 'short' });
  const time = now.toLocaleTimeString('en-GB', { ...zone, hour: '2-digit', minute: '2-digit', hour12: false }).replace(/^24/, '00');

  return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1, date: now.toLocaleDateString('en-CA', zone), time };
}

/**
 * Open right now? Checks a special day first, then today's slots, then last night's
 * overnight slots that run into this morning. null when no hours are listed.
 */
export function openNow(hours: WeeklyHour[], specials: SpecialDay[], now = new Date()): boolean | null {
  if (hours.length === 0) {
    return null;
  }
  const { day, date, time } = manilaNow(now);
  const special = specials.find((item) => item.date === date);
  if (special) {
    return !special.is_closed && special.opens_at !== null && special.closes_at !== null && within(time, special.opens_at, special.closes_at);
  }

  const yesterday = day === 1 ? 7 : day - 1;

  return hours.some((slot) => (slot.day_of_week === day && within(time, slot.opens_at, slot.closes_at))
    || (slot.day_of_week === yesterday && slot.closes_at < slot.opens_at && time < slot.closes_at));
}

function within(time: string, opens: string, closes: string): boolean {
  if (closes < opens) {
    return time >= opens; // the part before midnight; after midnight is checked against yesterday
  }

  return time >= opens && time < closes;
}
