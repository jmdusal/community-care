import { useState } from 'react';

/**
 * One series per day as columns: capped at 24px, 4px rounded tops on a single baseline,
 * hairline gridlines at clean ticks, and a hover / focus tooltip with the exact value.
 * The colour is brand-600 (validated against the light and dark surfaces).
 */
export function DailyColumns({ days, label, noun }: { days: Array<{ date: string; value: number }>; label: string; noun: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((day) => day.value), 0);
  const top = niceTop(max);
  const ticks = [top, Math.round(top / 2), 0];
  const showEvery = days.length > 31 ? 14 : days.length > 14 ? 7 : 1;
  const hovered = active === null ? null : days[active];

  return (
    <figure className="space-y-2" aria-label={label}>
      <div className="relative h-48 pl-8">
        {ticks.map((tick) => (
          <div key={tick} className="absolute right-0 left-8 flex items-center" style={{ bottom: `${(tick / top) * 100}%` }}>
            <span className="absolute -left-8 w-7 -translate-y-px text-right text-[10px] text-zinc-500 tabular-nums">{tick.toLocaleString()}</span>
            <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}

        <div className="absolute inset-y-0 right-0 left-8 flex items-end gap-0.5" onMouseLeave={() => setActive(null)}>
          {days.map((day, index) => (
            <button
              key={day.date}
              type="button"
              className="group flex h-full min-w-0 flex-1 items-end justify-center outline-none"
              aria-label={`${formatDay(day.date)}: ${day.value.toLocaleString()} ${noun}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span
                className="block w-full max-w-6 rounded-t bg-brand-600 transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-brand-500/50"
                style={{ height: day.value === 0 ? 0 : `max(${(day.value / top) * 100}%, 2px)`, opacity: active === null || active === index ? 1 : 0.45 }}
              />
            </button>
          ))}
        </div>

        {hovered && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-control border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{ left: `calc(2rem + (100% - 2rem) * ${(active + 0.5) / days.length})` }}
          >
            <div className="text-zinc-500">{formatDay(hovered.date)}</div>
            <div className="font-semibold text-zinc-900 tabular-nums dark:text-white">{hovered.value.toLocaleString()} {noun}</div>
          </div>
        )}
      </div>

      <div className="flex gap-0.5 pl-8 text-[10px] text-zinc-500">
        {days.map((day, index) => (
          <span key={day.date} className="min-w-0 flex-1 text-center whitespace-nowrap">{index % showEvery === 0 ? shortDay(day.date) : ''}</span>
        ))}
      </div>
    </figure>
  );
}

function niceTop(max: number): number {
  if (max <= 4) {
    return 4;
  }
  const step = 10 ** Math.floor(Math.log10(max));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((value) => value >= max) ?? max;

  return Math.ceil(nice / 2) * 2;
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shortDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
