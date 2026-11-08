import { Avatar } from '../../../components/ui/Avatar';
import { Pill } from '../../../components/ui/Pill';
import { formatDay } from '../../../lib/format';
import type { AdminFacility } from '../api';
import { StatusPills } from './StatusPills';

/** Admin facility list; a row opens the detail panel. */
export function FacilityTable({ facilities, onOpen }: { facilities: AdminFacility[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
            <th className="px-4 py-2.5 font-medium">Facility</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Last verified</th>
            <th className="px-4 py-2.5 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {facilities.map((facility) => (
            <tr key={facility.id} className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50" onClick={() => onOpen(facility.id)}>
              <td className="min-w-[260px] px-4 py-3">
                <button className="flex items-center gap-3 text-left" onClick={() => onOpen(facility.id)}>
                  <Avatar name={facility.name} className="rounded-control" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">{facility.name}</span>
                    <span className="block truncate text-xs text-zinc-500">{[facility.city, facility.region].filter(Boolean).join(', ') || 'Location not set'}</span>
                  </span>
                </button>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{facility.type ?? '—'}</td>
              <td className="px-3 py-3">
                <StatusPills facility={facility} />
                {facility.pending_changes ? <span className="mt-1 block"><Pill tone="amber">{facility.pending_changes} pending</Pill></span> : null}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-400">{formatDay(facility.verified_at)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">{facility.sources?.join(', ') || 'manual'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
