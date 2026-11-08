import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Panel } from '../../../components/ui/Panel';
import { type Appointment, formatTime } from '../../../lib/booking';
import { cx } from '../../../lib/cx';
import { useCalendar } from '../api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHOWN_PER_DAY = 3;

/** Status colours: a left bar plus a soft fill, so waiting requests stand out. */
const STATUS_STYLE: Record<string, string> = {
  requested: 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
  confirmed: 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
  completed: 'border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:text-sky-200',
  no_show: 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200',
  declined: 'border-zinc-300 bg-zinc-50 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400',
  cancelled: 'border-zinc-300 bg-zinc-50 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400',
};

const LEGEND = [
  ['requested', 'Waiting'],
  ['confirmed', 'Confirmed'],
  ['completed', 'Completed'],
  ['no_show', 'Missed'],
  ['cancelled', 'Cancelled / declined'],
] as const;

/** "YYYY-MM" and "YYYY-MM-DD" in Philippine time. */
const manilaDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + by, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The 6×7 grid of dates for a month, starting on Sunday. */
function gridFor(month: string): Array<{ date: string; inMonth: boolean }> {
  const [year, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);

    return { date: day.toISOString().slice(0, 10), inMonth: day.getUTCMonth() === m - 1 };
  });
}

/**
 * Month calendar of appointments: each day shows its first appointments (time, patient,
 * status colour) and "+N more". Clicking an appointment opens it; clicking a day lists all.
 */
export function AppointmentCalendar({ scope, onOpen, onOpenDay }: {
  scope: Record<string, string>;
  onOpen: (appointment: Appointment) => void;
  onOpenDay: (date: string, appointments: Appointment[]) => void;
}) {
  const [month, setMonth] = useState(thisMonth);
  const calendar = useCalendar(month, scope);
  const today = manilaDay(new Date().toISOString());
  const cells = useMemo(() => gridFor(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of calendar.data?.data ?? []) {
      const day = manilaDay(appointment.starts_at);
      map.set(day, [...(map.get(day) ?? []), appointment]);
    }

    return map;
  }, [calendar.data]);
  const title = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Button className="h-8 w-8 px-0" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="right" className="h-4 w-4 rotate-180" /></Button>
          <Button className="h-8 w-8 px-0" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="right" className="h-4 w-4" /></Button>
          <h2 className="ml-1 text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
          {month !== thisMonth() && <Button variant="ghost" className="h-8 text-xs" onClick={() => setMonth(thisMonth())}>Today</Button>}
          {calendar.isFetching && <Icon name="refresh" className="h-4 w-4 animate-spin text-zinc-400" />}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-white">{calendar.data?.meta.total ?? 0} this month</span>
          {LEGEND.map(([status, label]) => (
            <span key={status} className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-sm border-l-4', STATUS_STYLE[status])} />{label}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50 text-center text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-950/40">
        {WEEKDAYS.map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {cells.map(({ date, inMonth }) => {
          const items = byDay.get(date) ?? [];
          const isToday = date === today;
          const hidden = items.length - SHOWN_PER_DAY;

          return (
            <div key={date} className={cx('min-h-28 border-r border-b border-zinc-100 p-1.5 sm:min-h-32 dark:border-zinc-800', !inMonth && 'bg-zinc-50/70 dark:bg-zinc-950/40')}>
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => onOpenDay(date, items)}
                aria-label={`${date}: ${items.length} appointments`}
                className={cx('mb-1 flex w-full items-center justify-between rounded px-1 text-xs enabled:hover:bg-zinc-100 dark:enabled:hover:bg-zinc-800', inMonth ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400')}
              >
                <span className={cx('grid h-6 w-6 place-items-center rounded-full font-medium', isToday && 'bg-brand-700 text-white')}>{Number(date.slice(8))}</span>
                {items.length > 0 && <span className="text-[10px] font-semibold text-zinc-500">{items.length}</span>}
              </button>
              <div className="space-y-1">
                {items.slice(0, SHOWN_PER_DAY).map((appointment) => (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onOpen(appointment)}
                    title={`${formatTime(appointment.starts_at)} · ${appointment.patient?.name ?? ''} · ${appointment.status.label}`}
                    className={cx('block w-full truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-[11px] transition hover:brightness-95', STATUS_STYLE[appointment.status.value])}
                  >
                    <span className="font-semibold tabular-nums">{formatTime(appointment.starts_at)}</span> {appointment.patient?.name}
                  </button>
                ))}
                {hidden > 0 && (
                  <button type="button" onClick={() => onOpenDay(date, items)} className="w-full rounded px-1.5 text-left text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-100">
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {calendar.data?.meta.truncated && <p className="border-t border-zinc-100 px-4 py-2 text-xs text-amber-700 dark:border-zinc-800">Showing the first 1,000 appointments this month. Choose fewer facilities in the top bar to see all.</p>}
    </Panel>
  );
}
