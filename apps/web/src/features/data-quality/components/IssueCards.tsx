import { cx } from '../../../lib/cx';
import type { IssueKey, QualityReport } from '../api';

/** One card per issue type; click to show only facilities with that issue. */
export function IssueCards({ summary, active, onToggle }: { summary: QualityReport['summary']; active: IssueKey | null; onToggle: (key: IssueKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {(Object.entries(summary) as Array<[IssueKey, QualityReport['summary'][IssueKey]]>).map(([key, item]) => (
        <button
          key={key}
          type="button"
          aria-pressed={active === key}
          onClick={() => onToggle(key)}
          className={cx(
            'rounded-card border p-4 text-left transition',
            active === key ? 'border-brand-600 ring-2 ring-brand-500/30' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800',
            'bg-white dark:bg-zinc-900',
          )}
        >
          <span className="block text-xs text-zinc-500">{item.label}</span>
          <span className={cx('mt-1 block text-xl font-semibold tabular-nums', item.count > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-900 dark:text-white')}>{item.count}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{item.why}</span>
        </button>
      ))}
    </div>
  );
}
