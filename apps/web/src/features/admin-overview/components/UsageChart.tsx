import { useRef, useState } from 'react';
import { chartColors, type DashboardStats } from '../api';

type Point = DashboardStats['usage']['series'][number];

const W = 800;
const H = 220;

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/**
 * Searches and profile views per day: two lines on one axis (same unit), a
 * crosshair tooltip, a legend, and a table view for screen readers.
 */
export function UsageChart({ series, dark }: { series: Point[]; dark: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((point) => [point.searches, point.profile_views])) * 1.15;
  const x = (index: number) => (series.length < 2 ? W / 2 : (index / (series.length - 1)) * W);
  const y = (value: number) => H - (value / max) * H;
  const path = (key: 'searches' | 'profile_views') => series.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(' ');
  const mode = dark ? 'dark' : 'light';
  const colors = { searches: chartColors.searches[mode], profile_views: chartColors.profileViews[mode] };

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || series.length === 0) {
      return;
    }
    const index = Math.round(((event.clientX - box.left) / box.width) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, index)));
  };

  const point = hover === null ? null : series[hover];

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-zinc-600 dark:text-zinc-400" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: colors.searches }} />Searches</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: colors.profile_views }} />Profile views</span>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-zinc-100 dark:border-zinc-800" />)}
        </div>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="relative h-52 w-full cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Daily searches and profile views">
          <path d={path('searches')} fill="none" stroke={colors.searches} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={path('profile_views')} fill="none" stroke={colors.profile_views} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {point && hover !== null && (
          <>
            <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-600" style={{ left: `${(x(hover) / W) * 100}%` }} />
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-control border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > series.length / 2 ? 'calc(-100% - 10px)' : '10px'})` }}
            >
              <div className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">{dayLabel(point.date)}</div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ background: colors.searches }} />Searches <b className="ml-auto pl-4 tabular-nums">{point.searches.toLocaleString()}</b></div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ background: colors.profile_views }} />Profile views <b className="ml-auto pl-4 tabular-nums">{point.profile_views.toLocaleString()}</b></div>
            </div>
          </>
        )}
      </div>

      {series.length > 0 && (
        <div className="mt-2 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>{dayLabel(series[0].date)}</span>
          <span>{dayLabel(series[series.length - 1].date)}</span>
        </div>
      )}

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer select-none">View as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead><tr><th className="py-1 font-medium">Date</th><th className="py-1 text-right font-medium">Searches</th><th className="py-1 text-right font-medium">Profile views</th></tr></thead>
          <tbody>
            {series.map((row) => (
              <tr key={row.date} className="border-t border-zinc-100 dark:border-zinc-800"><td className="py-1">{dayLabel(row.date)}</td><td className="py-1 text-right">{row.searches}</td><td className="py-1 text-right">{row.profile_views}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
