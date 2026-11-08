import { type FormEvent, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { inputBase } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api';
import { cx } from '../../lib/cx';
import { useScope } from '../../lib/scope';
import { useLiveSearch } from '../../lib/useLiveSearch';
import { type AuditFilters, CATEGORIES, useAuditLogs } from './api';
import { AuditRow } from './components/AuditRow';

/** Audit log: filterable list of administrative events with redacted before/after values. */
export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1 });
  const [openId, setOpenId] = useState<number | null>(null);
  const { scope } = useScope();
  const logs = useAuditLogs(scope.facilityId ? { ...filters, resource_type: 'facility', resource_id: scope.facilityId } : filters);
  const set = (patch: Partial<AuditFilters>) => setFilters((current) => ({ ...current, page: 1, ...patch }));
  const search = useLiveSearch(filters.q, (q) => set({ q }));

  if (logs.error instanceof ApiError && logs.error.status === 403) {
    return <Alert tone="warning">Only administrators and verifiers can read the audit log.</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHead title="Audit log" description="Administrative actions, written by a queued listener after each change is committed." />

      {scope.facilityId && <Alert>Showing the history of {scope.name ?? 'the selected facility'} only.</Alert>}
      {scope.regionCode && <Alert tone="warning">The audit log can't be filtered by region, so all events are shown. Choose one facility in the top bar to see its history.</Alert>}

      <Panel className="overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800" onSubmit={(event: FormEvent) => { event.preventDefault(); search.flush(); }}>
          <SearchInput className="h-9 w-full sm:w-72" aria-label="Search action, resource or person" placeholder="Search action, resource or person" value={search.text} busy={search.pending || logs.isFetching} onChange={(event) => search.setText(event.target.value)} onClear={() => search.setText('')} />
          <Select aria-label="Category" className="w-40" placeholder="All categories" value={filters.category ?? ''} options={CATEGORIES} onChange={(event) => set({ category: event.target.value || undefined })} />
          <input type="date" aria-label="From date" className={cx(inputBase, 'w-40')} value={filters.from ?? ''} onChange={(event) => set({ from: event.target.value || undefined })} />
          <input type="date" aria-label="To date" className={cx(inputBase, 'w-40')} value={filters.to ?? ''} onChange={(event) => set({ to: event.target.value || undefined })} />
          <span className="ml-auto text-xs text-zinc-500">{logs.data ? `${logs.data.meta.total} events` : ''}</span>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="relative w-6 py-2.5 pr-2 pl-4"><span className="sr-only">Actions</span></th>
                <th className="px-2 py-2.5 font-medium">Time</th>
                <th className="px-3 py-2.5 font-medium">Actor</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Resource</th>
                <th className="py-2.5 pr-4 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="border-t border-zinc-100 dark:border-zinc-800">
              {logs.data?.data.map((entry) => <AuditRow key={entry.id} entry={entry} open={openId === entry.id} onToggle={() => setOpenId(openId === entry.id ? null : entry.id)} />)}
              {logs.data?.data.length === 0 && <tr><td colSpan={6} className="py-14 text-center text-sm text-zinc-500">No events match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {logs.data && <div className="border-t border-zinc-200 px-4 py-3 empty:hidden dark:border-zinc-800"><Pagination perPage={logs.data.meta.per_page} page={logs.data.meta.page} lastPage={logs.data.meta.last_page} total={logs.data.meta.total} onChange={(page) => setFilters((current) => ({ ...current, page }))} noun="events" /></div>}
      </Panel>

      <p className="flex items-center gap-2 text-xs text-zinc-500"><Icon name="lock" className="h-4 w-4" /> Passwords, tokens and personal contact details are redacted before logging. No medical data is written here.</p>
    </div>
  );
}
