import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { Tabs } from '../../components/ui/Tabs';
import { ApiError } from '../../lib/api';
import { scopeParams, useScope } from '../../lib/scope';
import { useLiveSearch } from '../../lib/useLiveSearch';
import { type ProgramStatus, useAdminPrograms } from './api';
import { ProgramEditor } from './components/ProgramEditor';
import { ProgramTable } from './components/ProgramTable';

type TabValue = 'all' | ProgramStatus;

/** Health programs: status tabs, search, table and the editor. Follows the top-bar scope. */
export function HealthProgramsPage() {
  const { scope } = useScope();
  const [tab, setTab] = useState<TabValue>('all');
  const [q, setQ] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const search = useLiveSearch(q, (value) => { setQ(value); setPage(1); });
  const programs = useAdminPrograms({ status: tab === 'all' ? undefined : tab, q, page, scope: scopeParams(scope) });
  const counts = programs.data?.meta.status_counts ?? {};

  if (programs.error instanceof ApiError && programs.error.status === 403) {
    return <Alert tone="warning">Only administrators and verifiers manage health programs.</Alert>;
  }

  return (
    <div className="space-y-5">
      <PageHead title="Health programs" description="Public campaigns such as vaccination drives and screenings, with their participating facilities.">
        <Button variant="primary" onClick={() => setCreating(true)}><Icon name="megaphone" /> New program</Button>
      </PageHead>

      <Tabs
        label="Program status"
        value={tab}
        onChange={(value) => { setTab(value); setPage(1); }}
        items={[
          { value: 'all', label: 'All', count: (counts.draft ?? 0) + (counts.published ?? 0) + (counts.archived ?? 0) },
          { value: 'published', label: 'Published', count: counts.published ?? 0 },
          { value: 'draft', label: 'Drafts', count: counts.draft ?? 0 },
          { value: 'archived', label: 'Archived', count: counts.archived ?? 0 },
        ]}
      />

      <Panel>
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <SearchInput className="h-9 sm:w-80" aria-label="Search programs" placeholder="Search by title" value={search.text} busy={search.pending || programs.isFetching} onChange={(event) => search.setText(event.target.value)} onClear={() => search.setText('')} />
        </div>
        {programs.data && programs.data.data.length > 0 ? (
          <>
            <ProgramTable programs={programs.data.data} onOpen={(program) => setEditing(program.id)} />
            {(
              <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <Pagination perPage={programs.data.meta.per_page} page={page} lastPage={programs.data.meta.last_page} total={programs.data.meta.total} onChange={setPage} noun="programs" />
              </div>
            )}
          </>
        ) : (
          <div className="p-5"><EmptyState icon="megaphone" title={programs.isPending ? 'Loading…' : 'No programs here'}>{!programs.isPending && 'Create a program and add the facilities taking part.'}</EmptyState></div>
        )}
      </Panel>

      <ProgramEditor open={creating || editing !== null} programId={editing} onClose={() => { setCreating(false); setEditing(null); }} />
    </div>
  );
}
