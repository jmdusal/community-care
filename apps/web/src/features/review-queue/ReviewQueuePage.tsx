import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Segmented } from '../../components/ui/Segmented';
import { Tabs } from '../../components/ui/Tabs';
import { can, useMe } from '../auth/useAuth';
import { scopeParams, useScope } from '../../lib/scope';
import { type QueueStatus, useChangeRequests } from './api';
import { ChangeRequestCard } from './components/ChangeRequestCard';
import { QueueSummary } from './components/QueueSummary';
import { ReportsList } from './components/ReportsList';

/** Review queue: proposals oldest-first, approved or rejected by a second person. */
export function ReviewQueuePage() {
  const me = useMe();
  const canReview = can(me.data, 'facilities.review');
  const [status, setStatus] = useState<QueueStatus>('submitted');
  const [page, setPage] = useState(1);
  const { scope } = useScope();
  const requests = useChangeRequests(status, page, scopeParams(scope));
  const queue = requests.data?.meta.queue;
  const [params, setParams] = useSearchParams();
  const section = params.get('tab') === 'reports' ? 'reports' : 'changes';
  const canSeeReports = can(me.data, 'facilities.edit');

  return (
    <div className="space-y-6">
      <PageHead title="Review queue" description="Every change needs a second person. The person who proposed it can never approve it.">
        {canSeeReports && (
          <Segmented label="Section" value={section} onChange={(value) => setParams(value === 'reports' ? { tab: 'reports' } : {})} options={[{ value: 'changes', label: 'Change requests' }, { value: 'reports', label: 'Reports from the public' }]} />
        )}
      </PageHead>

      {section === 'reports' && canSeeReports ? <ReportsList scope={scopeParams(scope)} /> : (
      <>

      {queue && <QueueSummary queue={queue} />}

      <Tabs
        label="Request status"
        value={status}
        onChange={(value) => { setStatus(value); setPage(1); }}
        items={[{ value: 'submitted', label: 'Waiting' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'withdrawn', label: 'Withdrawn' }]}
      />

      {requests.data?.data.length === 0 && <EmptyState icon="inbox" title={status === 'submitted' ? 'Nothing to review' : 'Nothing here'}>{status === 'submitted' ? 'New proposals appear here as soon as they are submitted.' : undefined}</EmptyState>}

      <div className="space-y-4">
        {requests.data?.data.map((request) => <ChangeRequestCard key={request.id} request={request} canReview={canReview} />)}
      </div>

      {requests.data && <Pagination perPage={requests.data.meta.per_page} page={requests.data.meta.page} lastPage={requests.data.meta.last_page} total={requests.data.meta.total} onChange={setPage} noun="requests" />}
      </>
      )}
    </div>
  );
}
