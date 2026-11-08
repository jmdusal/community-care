import type { ReactNode } from 'react';

export type FieldChange = { before: unknown; after: unknown };

const LABELS: Record<string, string> = {
  name: 'Name',
  type: 'Facility type',
  address: 'Address',
  city_code: 'City / municipality (PSGC)',
  barangay_code: 'Barangay (PSGC)',
  latitude: 'Latitude',
  longitude: 'Longitude',
  contacts: 'Contacts',
  hours: 'Opening hours',
  hour_exceptions: 'Special days',
  services: 'Services',
};

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatRange(opens: string, closes: string): string {
  if (opens === '00:00' && closes === '24:00') {
    return '24 hours';
  }

  return closes < opens ? `${opens}–${closes} (next day)` : `${opens}–${closes}`;
}

function render(field: string, value: unknown): ReactNode {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
    return <em className="text-zinc-500 dark:text-zinc-400">empty</em>;
  }
  if (field === 'contacts' && Array.isArray(value)) {
    return value.map((contact: { type: string; value: string }) => `${contact.type}: ${contact.value}`).join(' · ');
  }
  if (field === 'hours' && Array.isArray(value)) {
    return value.map((hour: { day_of_week: number; opens_at: string; closes_at: string }) => `${DAYS[hour.day_of_week]} ${formatRange(hour.opens_at, hour.closes_at)}`).join(' · ');
  }
  if (field === 'hour_exceptions' && Array.isArray(value)) {
    return value.map((day: { date: string; is_closed: boolean; opens_at: string | null; closes_at: string | null; reason: string | null }) =>
      `${day.date} ${day.is_closed ? 'closed' : formatRange(day.opens_at ?? '', day.closes_at ?? '')}${day.reason ? ` (${day.reason})` : ''}`).join(' · ');
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}

/** Field-by-field before → after view of a change request. */
export function ChangeDiff({ changes }: { changes: Record<string, FieldChange> }) {
  return (
    <dl className="divide-y divide-zinc-100 overflow-hidden rounded-control border border-zinc-200 text-xs dark:divide-zinc-800 dark:border-zinc-800">
      {Object.entries(changes).map(([field, change]) => (
        <div key={field} className="grid gap-1 px-3 py-2 sm:grid-cols-[150px_1fr]">
          <dt className="font-medium text-zinc-500">{LABELS[field] ?? field}</dt>
          <dd className="space-y-0.5">
            <div className="text-rose-700 line-through decoration-rose-300 dark:text-rose-400">{render(field, change.before)}</div>
            <div className="text-emerald-700 dark:text-emerald-400">{render(field, change.after)}</div>
          </dd>
        </div>
      ))}
    </dl>
  );
}
