import { Icon } from '../../../components/ui/Icon';
import { cx } from '../../../lib/cx';
import type { Area } from '../api';

/** One level of the PSGC hierarchy (Miller column) with facility counts. */
export function GeoColumn({ title, areas, selectedCode, onSelect, isLeaf, emptyHint, isLoading }: {
  title: string;
  areas: Area[] | undefined;
  selectedCode: string | null;
  onSelect: (area: Area) => void;
  isLeaf?: boolean;
  emptyHint: string;
  isLoading?: boolean;
}) {
  return (
    <section aria-label={title} className="min-w-0 border-b border-zinc-200 last:border-0 md:border-r md:border-b-0 dark:border-zinc-800">
      <h2 className="border-b border-zinc-100 px-4 py-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800">{title}</h2>
      {areas && areas.length > 0 ? (
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {areas.map((area) => {
            const isSelected = selectedCode === area.code;

            return (
              <li key={area.code}>
                <button
                  onClick={() => onSelect(area)}
                  aria-current={isSelected}
                  className={cx('flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left transition', isSelected ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50')}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate text-sm', isSelected ? 'font-medium text-brand-700 dark:text-brand-500' : 'text-zinc-800 dark:text-zinc-200', area.kind === 'independent_cities' && 'italic')}>{area.name}</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {area.kind === 'independent_cities' ? <span>Not part of any province</span> : <span className="font-mono">{area.code}</span>}
                      {area.independent && <span className="rounded bg-sky-50 px-1 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" title="Highly urbanized or independent component city: not administratively part of this province">Independent city</span>}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums">{area.facilities.toLocaleString()}</span>
                  {!isLeaf && <Icon name="right" className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">{isLoading ? 'Loading…' : emptyHint}</p>
      )}
    </section>
  );
}
