import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { isNarrowed, scopeParams, useScope } from '../../lib/scope';
import { useLiveSearch } from '../../lib/useLiveSearch';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { Tabs } from '../../components/ui/Tabs';
import { can, useMe } from '../auth/useAuth';
import { useAdminFacilities, useCreateFacility, type VerificationStatus } from './api';
import { emptyValues, FacilityForm } from './components/FacilityForm';
import { FacilityDrawer } from './components/FacilityDrawer';
import { FacilityTable } from './components/FacilityTable';
import { verificationLabel } from './components/StatusPills';

type TabValue = 'all' | VerificationStatus;

/** Facilities screen: status tabs, search, table, detail panel and "new facility". */
export function FacilitiesPage() {
  const me = useMe();
  const canReview = can(me.data, 'facilities.review');
  const canCreate = can(me.data, 'facilities.create');
  const editsGoLive = can(me.data, 'facilities.publish_directly');
  const [tab, setTab] = useState<TabValue>('all');
  const { scope } = useScope();
  const [search, setSearch] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const live = useLiveSearch(search, (value) => { setSearch(value); setPage(1); });
  const [params, setParams] = useSearchParams();
  const [openId, setOpenIdState] = useState<string | null>(params.get('open'));
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    if (id === null && params.has('open')) {
      setParams({}, { replace: true });
    }
  };
  const [creating, setCreating] = useState(false);
  const create = useCreateFacility();
  const facilities = useAdminFacilities({ q: search, status: tab === 'all' ? undefined : tab, page, scope: scopeParams(scope) });
  const counts = facilities.data?.meta.status_counts ?? {};
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    live.flush();
  };

  return (
    <div className="space-y-5">
      <PageHead title="Facilities" description={editsGoLive ? 'Every record, published or not. As a system admin, your edits go live at once; others\' edits need a second person.' : canCreate ? 'Every record, published or not. Edits become change requests that a second person approves.' : 'Facilities assigned to you. Edits are reviewed by a second person before they go live.'}>
        {canCreate && <Button variant="primary" onClick={() => setCreating(true)}><Icon name="building" /> New facility</Button>}
      </PageHead>

      {isNarrowed(scope) && <ScopeNote name={scope.name} />}
      {create.isSuccess && <Alert>{create.data?.status === 'approved' ? 'New facility created and published.' : 'New facility submitted. It appears publicly after another reviewer approves it in the Review queue.'}</Alert>}

      <Tabs
        label="Verification status"
        value={tab}
        onChange={(value) => { setTab(value); setPage(1); }}
        items={[{ value: 'all', label: 'All', count: total }, ...(Object.keys(verificationLabel) as VerificationStatus[]).map((status) => ({ value: status, label: verificationLabel[status].label, count: counts[status] ?? 0 }))]}
      />

      <Panel>
        <form onSubmit={submitSearch} className="border-b border-zinc-200 p-3 dark:border-zinc-800" role="search">
          <SearchInput className="h-9 sm:w-80" aria-label="Search by name or ID" placeholder="Search by name or ID" value={live.text} busy={live.pending || facilities.isFetching} onChange={(event) => live.setText(event.target.value)} onClear={() => live.setText('')} />
        </form>
        {facilities.data && facilities.data.data.length > 0 ? (
          <>
            <FacilityTable facilities={facilities.data.data} onOpen={setOpenId} />
            <div className="border-t border-zinc-200 px-4 py-3 empty:hidden dark:border-zinc-800">
              <Pagination perPage={facilities.data.meta.per_page} page={facilities.data.meta.page} lastPage={facilities.data.meta.last_page} total={facilities.data.meta.total} onChange={setPage} noun="facilities" />
            </div>
          </>
        ) : (
          <div className="p-5"><EmptyState icon="building" title={facilities.isPending ? 'Loading…' : 'No facilities here'}>{!facilities.isPending && 'Try another tab or search, or import a DOH NHFR file.'}</EmptyState></div>
        )}
      </Panel>

      <FacilityDrawer id={openId} canReview={canReview} onClose={() => setOpenId(null)} />

      <Modal open={creating} onClose={() => setCreating(false)} title="New facility" description="Creates an unpublished draft and a change request for another reviewer." size="lg">
        <FacilityForm
          initial={emptyValues}
          submitLabel="Submit for review"
          pending={create.isPending}
          error={create.error}
          onCancel={() => setCreating(false)}
          onSubmit={(values) => create.mutate(values, { onSuccess: () => setCreating(false) })}
        />
      </Modal>
    </div>
  );
}

/** Reminds the user that the list is narrowed by the top-bar picker. */
function ScopeNote({ name }: { name?: string }) {
  return <Alert>Showing {name ?? 'the selected scope'} only. Change it with the picker in the top bar.</Alert>;
}
