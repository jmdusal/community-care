import { Icon } from '../../../components/ui/Icon';
import { cx } from '../../../lib/cx';
import type { StagingRecord } from '../api';

/** A record's import flags (red when they block publishing) and its duplicate candidates. */
export function FlagList({ record }: { record: StagingRecord }) {
  if (record.flags.length === 0) {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span>;
  }

  return (
    <div className="space-y-1">
      {record.flags.map((flag) => (
        <div key={flag.code} className={cx('flex items-start gap-1 text-xs', record.is_flagged ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}>
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {flag.label}
            {flag.detail && <span className="block text-[11px] text-zinc-500">{flag.detail}</span>}
          </span>
        </div>
      ))}
      {record.duplicates.map((duplicate) => (
        <div key={duplicate.facility_id} className="text-[11px] text-zinc-500">
          ≈ {duplicate.name} ({duplicate.score}% similar)
        </div>
      ))}
    </div>
  );
}
