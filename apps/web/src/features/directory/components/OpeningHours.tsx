import { formatRange, isAllDay, manilaNow, openNow } from '../../../lib/hours';
import { cx } from '../../../lib/cx';
import type { FacilityDetail } from '../api';
import { DAY_NAMES, formatDay } from '../format';

/** Weekly hours (today highlighted, open-now badge) plus upcoming special days. */
export function OpeningHours({ hours, exceptions }: { hours: FacilityDetail['hours']; exceptions: FacilityDetail['hour_exceptions'] }) {
  if (hours.length === 0) {
    return <p className="text-sm text-zinc-500">Opening hours are not listed. Call ahead before visiting.</p>;
  }

  const today = manilaNow().day;
  const open = openNow(hours, exceptions);
  const everyDay24 = DAY_NAMES.every((_, index) => hours.some((hour) => hour.day_of_week === index + 1 && isAllDay(hour)));

  return (
    <div className="space-y-4">
      {open !== null && (
        <p className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', open ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')}>
          <span className={cx('h-1.5 w-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-zinc-400')} aria-hidden="true" />
          {open ? 'Open now' : 'Closed now'}
        </p>
      )}

      {everyDay24 ? (
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Open 24 hours, every day</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {DAY_NAMES.map((day, index) => {
              const slots = hours.filter((hour) => hour.day_of_week === index + 1).sort((a, b) => a.opens_at.localeCompare(b.opens_at));
              const isToday = index + 1 === today;

              return (
                <tr key={day} className={isToday ? 'font-semibold' : undefined}>
                  <th scope="row" className={cx('py-1.5 pr-4 text-left font-normal', isToday ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500')}>{day}{isToday && <span className="sr-only"> (today)</span>}</th>
                  <td className="py-1.5 text-right text-zinc-900 tabular-nums dark:text-zinc-100">{slots.length ? slots.map((slot) => formatRange(slot.opens_at, slot.closes_at)).join(', ') : 'Closed'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {exceptions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Special days</p>
          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
            {exceptions.map((exception) => (
              <li key={exception.date}>
                {formatDay(exception.date)}: {exception.is_closed ? 'Closed' : formatRange(exception.opens_at ?? '', exception.closes_at ?? '')}
                {exception.reason ? ` (${exception.reason})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
