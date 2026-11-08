import { Link } from 'react-router';
import { ActionsHeader, RowActions } from '../../../components/ui/RowActions';
import { Pill } from '../../../components/ui/Pill';
import type { QualityReport } from '../api';

/** Facilities with issues, most issues first. "Fix" opens the record on the Facilities screen. */
export function IssueTable({ rows, labels }: { rows: QualityReport['facilities']; labels: QualityReport['summary'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="px-4 py-2.5 font-medium">Facility</th>
            <th className="px-3 py-2.5 font-medium">Issues</th>
            <ActionsHeader />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="min-w-[200px] px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.name}</div>
                <div className="text-xs text-zinc-500">{[row.city, row.region].filter(Boolean).join(', ') || 'No area set'}{row.published ? '' : ' · not published'}</div>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {row.issues.map((issue) => <Pill key={issue} tone={issue === 'outside_area' || issue === 'not_verified' || issue === 'possible_duplicate' ? 'rose' : 'amber'}>{labels[issue].label}</Pill>)}
                </div>
                {row.duplicate_of && (
                  <div className="mt-1 text-[11px] text-zinc-500">Similar to <Link to={`/admin/facilities?open=${row.duplicate_of.id}`} className="text-brand-700 underline dark:text-brand-100">{row.duplicate_of.name}</Link></div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions label={`Actions for ${row.name}`} actions={[{ label: 'Fix this facility', icon: 'edit', to: `/admin/facilities?open=${row.id}` }]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
