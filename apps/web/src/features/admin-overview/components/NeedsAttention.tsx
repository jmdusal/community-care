import { Link } from 'react-router';
import { Icon } from '../../../components/ui/Icon';
import { Panel } from '../../../components/ui/Panel';
import { Pill } from '../../../components/ui/Pill';
import { formatDate } from '../../../lib/format';
import type { DashboardStats } from '../api';

/** Oldest change requests waiting for a second reviewer. */
export function NeedsAttention({ items }: { items: DashboardStats['needs_attention'] }) {
  return (
    <Panel title="Needs attention" description="Oldest proposals waiting for a second reviewer" action={<Link to="/admin/review-queue" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-500">Review queue</Link>}>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 pb-5 text-sm text-zinc-500"><Icon name="check" className="h-4 w-4 text-brand-600" /> Nothing is waiting for review.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.facility.name}</div>
                <div className="truncate text-xs text-zinc-500">
                  {item.origin === 'create' ? 'New facility' : `Changes: ${item.fields.join(', ')}`} · {item.submitted_by ?? 'unknown'} · {formatDate(item.submitted_at)}
                </div>
              </div>
              <Pill tone={item.origin === 'create' ? 'sky' : 'amber'}>{item.origin === 'create' ? 'new' : 'edit'}</Pill>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
