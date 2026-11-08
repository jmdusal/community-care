import { Link } from 'react-router';
import { Avatar } from '../../../components/ui/Avatar';
import { Panel } from '../../../components/ui/Panel';
import { formatDate } from '../../../lib/format';
import type { DashboardStats } from '../api';

/** Latest audit-log entries, written by the queued audit listener. */
export function ActivityFeed({ items }: { items: DashboardStats['recent_activity'] }) {
  return (
    <Panel title="Activity" description="From the audit log" action={<Link to="/admin/audit-log" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-500">Audit log</Link>}>
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <ul className="space-y-3 px-5 pb-5">
          {items.map((item, index) => (
            <li key={`${item.created_at}-${index}`} className="flex items-start gap-3">
              <Avatar name={item.actor} className="h-6 w-6 text-[10px]" />
              <p className="min-w-0 flex-1 text-sm break-words text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.actor}</span> <code className="text-xs break-all">{item.action}</code>
                {item.resource_id && <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{item.resource_type} {item.resource_id}</span>}
              </p>
              <span className="shrink-0 text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">{formatDate(item.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
