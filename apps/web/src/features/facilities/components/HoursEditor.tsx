import { Button } from '../../../components/ui/Button';
import { inputBase } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Select } from '../../../components/ui/Select';
import { cx } from '../../../lib/cx';
import { isAllDay } from '../../../lib/hours';
import type { FacilityValues } from '../api';

type Hour = FacilityValues['hours'][number];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((label, index) => ({ value: String(index + 1), label }));

/**
 * Weekly opening hours: one row per day / time slot (two rows for a lunch break). A day
 * with no row is closed. "Open 24 hours" covers the whole day; a closing time earlier than
 * the opening time runs past midnight (e.g. 22:00–06:00).
 */
export function HoursEditor({ value, onChange }: { value: Hour[]; onChange: (value: Hour[]) => void }) {
  const update = (index: number, patch: Partial<Hour>) => onChange(value.map((hour, i) => (i === index ? { ...hour, ...patch } : hour)));
  const missing = (days: number[]) => days.filter((day) => !value.some((hour) => hour.day_of_week === day));

  const addWeekdays = () => onChange([...value, ...missing([1, 2, 3, 4, 5]).map((day) => ({ day_of_week: day, opens_at: '08:00', closes_at: '17:00' }))]);
  const allWeek24 = () => onChange([1, 2, 3, 4, 5, 6, 7].map((day) => ({ day_of_week: day, opens_at: '00:00', closes_at: '24:00' })));
  const sorted = value.map((hour, index) => ({ hour, index })).sort((a, b) => a.hour.day_of_week - b.hour.day_of_week || a.hour.opens_at.localeCompare(b.hour.opens_at));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-zinc-500">No hours yet: the public page says "Hours not listed".</p>}
      {sorted.map(({ hour, index }) => {
        const allDay = isAllDay(hour);
        const overnight = !allDay && hour.closes_at !== '' && hour.closes_at < hour.opens_at;

        return (
          <div key={index} className="flex items-center gap-1.5">
            <Select aria-label="Day" className="w-[8.75rem] shrink-0" value={String(hour.day_of_week)} options={DAYS} onChange={(event) => update(index, { day_of_week: Number(event.target.value) })} />
            {allDay ? (
              <span className="inline-flex h-9 flex-1 items-center rounded-control bg-brand-50 px-3 text-xs font-medium text-brand-700 dark:bg-brand-700/20 dark:text-brand-100">Open 24 hours</span>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <input type="time" aria-label="Opens at" className={cx(inputBase, 'w-0 min-w-0 flex-1 px-2')} value={hour.opens_at} onChange={(event) => update(index, { opens_at: event.target.value })} />
                <span className="text-xs text-zinc-400" aria-hidden="true">–</span>
                <input type="time" aria-label={overnight ? 'Closes at (next day)' : 'Closes at'} title={overnight ? 'Closes the next day' : undefined} className={cx(inputBase, 'w-0 min-w-0 flex-1 px-2', overnight && 'border-amber-300 dark:border-amber-500/50')} value={hour.closes_at} onChange={(event) => update(index, { closes_at: event.target.value })} />
              </div>
            )}
            <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400" title="Open 24 hours">
              <input type="checkbox" className="accent-brand-600" checked={allDay} onChange={(event) => update(index, event.target.checked ? { opens_at: '00:00', closes_at: '24:00' } : { opens_at: '08:00', closes_at: '17:00' })} />
              24h
            </label>
            <Button variant="ghost" className="h-9 shrink-0 px-1.5" aria-label="Remove hours" onClick={() => onChange(value.filter((_, i) => i !== index))}><Icon name="x" /></Button>
          </div>
        );
      })}
      {value.some((hour) => !isAllDay(hour) && hour.closes_at !== '' && hour.closes_at < hour.opens_at) && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">A closing time earlier than the opening time means it closes the next day (e.g. 10 PM – 6 AM).</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button className="h-7 text-xs" onClick={() => onChange([...value, { day_of_week: missing([1, 2, 3, 4, 5, 6, 7])[0] ?? 6, opens_at: '08:00', closes_at: '12:00' }])}><Icon name="plus" className="h-3.5 w-3.5" /> Add hours</Button>
        <Button variant="ghost" className="h-7 text-xs" onClick={addWeekdays}>Mon–Fri 8:00–17:00</Button>
        <Button variant="ghost" className="h-7 text-xs" onClick={allWeek24}>Open 24/7</Button>
      </div>
    </div>
  );
}

type SpecialDay = FacilityValues['hour_exceptions'][number];

/** Holidays and one-off changes: closed for the day, or different hours, with a short reason. */
export function SpecialDaysEditor({ value, onChange, error }: { value: SpecialDay[]; onChange: (value: SpecialDay[]) => void; error?: string }) {
  const update = (index: number, patch: Partial<SpecialDay>) => onChange(value.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-zinc-500">None. Add holidays, closures or days with different hours.</p>}
      {value.map((day, index) => (
        <div key={index} className="space-y-2 rounded-control border border-zinc-200 p-2.5 dark:border-zinc-700">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Date" min={today} className={cx(inputBase, 'w-40')} value={day.date} onChange={(event) => update(index, { date: event.target.value })} required />
            <Select
              aria-label="Open or closed"
              className="w-40"
              value={day.is_closed ? 'closed' : 'open'}
              options={[{ value: 'closed', label: 'Closed all day' }, { value: 'open', label: 'Different hours' }]}
              onChange={(event) => update(index, event.target.value === 'closed' ? { is_closed: true, opens_at: null, closes_at: null } : { is_closed: false, opens_at: '08:00', closes_at: '12:00' })}
            />
            {!day.is_closed && (
              <>
                <input type="time" aria-label="Opens at" className={cx(inputBase, 'w-28')} value={day.opens_at ?? ''} onChange={(event) => update(index, { opens_at: event.target.value })} required />
                <span className="text-xs text-zinc-400">to</span>
                <input type="time" aria-label="Closes at" className={cx(inputBase, 'w-28')} value={day.closes_at ?? ''} onChange={(event) => update(index, { closes_at: event.target.value })} required />
              </>
            )}
            <Button variant="ghost" className="ml-auto h-9 px-2" aria-label="Remove special day" onClick={() => onChange(value.filter((_, i) => i !== index))}><Icon name="x" /></Button>
          </div>
          <input className={cx(inputBase, 'w-full')} aria-label="Reason" placeholder="Reason shown to the public, e.g. Holiday, staff training" maxLength={120} value={day.reason ?? ''} onChange={(event) => update(index, { reason: event.target.value })} />
        </div>
      ))}
      {error && <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>}
      <Button className="h-7 text-xs" onClick={() => onChange([...value, { date: today, is_closed: true, opens_at: null, closes_at: null, reason: '' }])}><Icon name="plus" className="h-3.5 w-3.5" /> Add special day</Button>
    </div>
  );
}
