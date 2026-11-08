import { Link } from 'react-router';
import type { QueueResponse } from '../api';

/** Everything that needs a reviewer, with links to where each is handled. */
export function QueueSummary({ queue }: { queue: NonNullable<QueueResponse['meta']['queue']> }) {
  const items = [
    { label: 'Change requests', value: queue.pending_changes, hint: 'below', to: null },
    { label: 'Stale facilities', value: queue.stale_facilities, hint: 'Re-verify on Facilities', to: '/admin/facilities' },
    // Import records are not linked to a facility until they are approved, so this count is always system-wide.
    { label: 'Flagged import records · all facilities', value: queue.flagged_import_records, hint: 'Decide on Imports', to: '/admin/imports' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-card border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">{item.label}</div>
          <div className="mt-1 text-xl font-semibold text-zinc-900 tabular-nums dark:text-white">{item.value.toLocaleString()}</div>
          {item.to ? (
            <Link to={item.to} className="text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-500">{item.hint}</Link>
          ) : (
            <span className="text-[11px] text-zinc-500">{item.hint}</span>
          )}
        </div>
      ))}
    </div>
  );
}
