import { Panel } from '../../../components/ui/Panel';
import { cx } from '../../../lib/cx';
import type { Area } from '../api';

/** Counts and verification coverage for the selected area. */
export function AreaSummary({ area, levelName }: { area: Area; levelName: string }) {
  const coverage = area.facilities > 0 ? Math.round((area.verified / area.facilities) * 100) : 0;
  const stats: Array<[string, number]> = [
    ['Facilities', area.facilities],
    ['Verified', area.verified],
    ['Missing coordinates', area.missing_coordinates],
  ];

  return (
    <Panel title={area.name} description={`${levelName} · PSGC ${area.code}`}>
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-control bg-zinc-50 p-4 dark:bg-zinc-800/60">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums dark:text-white">{value.toLocaleString()}</div>
          </div>
        ))}
        <div className="sm:col-span-3">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-zinc-500">Verification coverage</span>
            <span className="font-medium text-zinc-900 tabular-nums dark:text-white">{area.facilities ? `${coverage}%` : 'No facilities yet'}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="progressbar" aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100} aria-label="Verification coverage">
            <div className={cx('h-full rounded-full', coverage >= 90 ? 'bg-brand-500' : coverage >= 80 ? 'bg-amber-400' : 'bg-rose-500')} style={{ width: `${coverage}%` }} />
          </div>
        </div>
      </div>
    </Panel>
  );
}
