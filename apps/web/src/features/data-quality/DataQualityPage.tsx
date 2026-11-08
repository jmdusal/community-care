import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHead } from '../../components/ui/PageHead';
import { PAGE_SIZE, Pagination, pageOf } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { scopeParams, useScope } from '../../lib/scope';
import { type IssueKey, useDataQuality } from './api';
import { IssueCards } from './components/IssueCards';
import { IssueTable } from './components/IssueTable';

/** Pilot data-quality review: what is missing or doubtful per facility, for the selected scope. */
export function DataQualityPage() {
  const { scope } = useScope();
  const report = useDataQuality(scopeParams(scope));
  const [filter, setFilter] = useState<IssueKey | null>(null);
  const [page, setPage] = useState(1);
  const data = report.data;
  const rows = (data?.facilities ?? []).filter((row) => filter === null || row.issues.includes(filter));
  const paged = pageOf(rows, page, PAGE_SIZE);
  const percent = data && data.total > 0 ? Math.round((data.complete / data.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHead
        title="Data quality"
        description={data ? `${data.complete} of ${data.total} facilities are complete (${percent}%). Fix the rest before people rely on them.` : 'Missing or doubtful details on facility records.'}
      />

      {data && <IssueCards summary={data.summary} active={filter} onToggle={(key) => { setFilter(filter === key ? null : key); setPage(1); }} />}

      <Panel title={filter && data ? data.summary[filter].label : 'Facilities with issues'} description={filter ? 'Click the card again to show every issue.' : 'Most issues first.'}>
        {rows.length > 0 && data ? (
          <>
            <IssueTable rows={paged.rows} labels={data.summary} />
            <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <Pagination page={paged.page} lastPage={paged.lastPage} total={rows.length} perPage={PAGE_SIZE} onChange={setPage} noun="facilities" />
            </div>
          </>
        ) : (
          <div className="p-5"><EmptyState icon="check" title={report.isPending ? 'Checking…' : 'Nothing to fix here'}>{!report.isPending && 'Every facility in this scope has the basics: position, contact, hours, services and a current verification.'}</EmptyState></div>
        )}
      </Panel>
    </div>
  );
}
