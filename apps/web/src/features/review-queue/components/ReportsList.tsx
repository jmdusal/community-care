import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { inputClass } from '../../../components/ui/Field';
import { Pagination } from '../../../components/ui/Pagination';
import { Pill } from '../../../components/ui/Pill';
import { Tabs } from '../../../components/ui/Tabs';
import { formatDate } from '../../../lib/format';
import { type FacilityReport, type ReportStatus, useFacilityReports, useHandleReport } from '../reportsApi';

/**
 * Reports from the public that something on a facility's page is wrong. Open the facility
 * to fix it (propose a change), then mark the report fixed, or dismiss it.
 */
export function ReportsList({ scope }: { scope: Record<string, string> }) {
  const [status, setStatus] = useState<ReportStatus>('open');
  const [page, setPage] = useState(1);
  const reports = useFacilityReports(status, page, scope);
  const counts = reports.data?.meta.counts;

  return (
    <div className="space-y-4">
      <Tabs
        label="Report status"
        value={status}
        onChange={(value) => { setStatus(value); setPage(1); }}
        items={[{ value: 'open', label: 'Open', count: counts?.open }, { value: 'resolved', label: 'Fixed', count: counts?.resolved }, { value: 'dismissed', label: 'Dismissed', count: counts?.dismissed }]}
      />

      {reports.data?.data.length === 0 && <EmptyState icon="check" title={status === 'open' ? 'No open reports' : 'Nothing here'}>{status === 'open' ? 'When someone reports wrong information on a facility page, it appears here.' : undefined}</EmptyState>}

      <div className="space-y-3">
        {reports.data?.data.map((report) => <ReportCard key={report.id} report={report} />)}
      </div>

      {reports.data && reports.data.meta.total > 0 && <Pagination perPage={reports.data.meta.per_page} page={reports.data.meta.page} lastPage={reports.data.meta.last_page} total={reports.data.meta.total} onChange={setPage} noun="reports" />}
    </div>
  );
}

function ReportCard({ report }: { report: FacilityReport }) {
  const handle = useHandleReport();
  const [note, setNote] = useState('');

  return (
    <article className="space-y-3 rounded-card border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/admin/facilities?open=${report.facility.id}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-white">{report.facility.name}</Link>
          <p className="text-xs text-zinc-500">Reported {formatDate(report.created_at)}</p>
        </div>
        <Pill tone={report.status === 'open' ? 'amber' : report.status === 'resolved' ? 'emerald' : 'zinc'}>{report.reason.label}</Pill>
      </div>
      {report.details && <p className="rounded-control bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">“{report.details}”</p>}
      {report.contact && <p className="text-xs text-zinc-500">Reporter contact: {report.contact}</p>}

      {report.status === 'open' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input className={inputClass} placeholder="What did you do? (optional)" value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
          <div className="flex shrink-0 gap-2">
            <Link to={`/admin/facilities?open=${report.facility.id}`} className="inline-flex h-9 items-center rounded-control border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">Open facility</Link>
            <Button variant="brand" disabled={handle.isPending} onClick={() => handle.mutate({ id: report.id, action: 'resolve', note: note.trim() || undefined })}>Mark fixed</Button>
            <Button disabled={handle.isPending} onClick={() => handle.mutate({ id: report.id, action: 'dismiss', note: note.trim() || undefined })}>Dismiss</Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">{report.status === 'resolved' ? 'Fixed' : 'Dismissed'} by {report.resolved_by ?? 'someone'} {report.resolved_at ? formatDate(report.resolved_at) : ''}{report.resolution_note ? ` · “${report.resolution_note}”` : ''}</p>
      )}
    </article>
  );
}
