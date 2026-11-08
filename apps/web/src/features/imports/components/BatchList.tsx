import { Panel } from '../../../components/ui/Panel';
import { Pill } from '../../../components/ui/Pill';
import { cx } from '../../../lib/cx';
import type { ImportBatch } from '../api';
import { formatDate, statusPill } from '../presentation';

/** Selectable list of import batches, newest first. */
export function BatchList({ batches, selectedId, onSelect }: { batches: ImportBatch[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <Panel className="overflow-hidden" title="Batch history" description="Newest first">
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        {batches.map((batch) => (
          <li key={batch.id}>
            <button
              onClick={() => onSelect(batch.id)}
              aria-current={selectedId === batch.id}
              className={cx('w-full px-5 py-3 text-left transition', selectedId === batch.id ? 'bg-brand-50/70 dark:bg-brand-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50')}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{batch.original_filename}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {batch.source} · {formatDate(batch.created_at)}
                  </div>
                </div>
                <Pill tone={statusPill[batch.status].tone} dot>{statusPill[batch.status].label}</Pill>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
