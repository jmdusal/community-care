import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ChangeDiff } from '../../../components/shared/ChangeDiff';
import { KeyValueList } from '../../../components/ui/KeyValueList';
import { Pill } from '../../../components/ui/Pill';
import { SlideOver } from '../../../components/ui/SlideOver';
import { formatDate, formatDay } from '../../../lib/format';
import { useAdminFacility, useProposeChange } from '../api';
import { FacilityForm } from './FacilityForm';
import { ReviewActions } from './ReviewActions';
import { TodayEditor } from './TodayEditor';
import { can, useMe } from '../../auth/useAuth';
import { StatusPills } from './StatusPills';

/** Facility detail with "propose a change", verifier actions and change history. */
export function FacilityDrawer({ id, canReview, onClose }: { id: string | null; canReview: boolean; onClose: () => void }) {
  const facility = useAdminFacility(id);
  const me = useMe();
  const [editing, setEditing] = useState(false);
  const propose = useProposeChange(id ?? '');
  const data = facility.data;

  const close = () => {
    setEditing(false);
    propose.reset();
    onClose();
  };

  return (
    <SlideOver open={id !== null} onClose={close} title={data?.name ?? 'Facility'} description={data ? `${data.type ?? 'Type not set'} · ${data.id}` : undefined}>
      {!data ? (
        <p className="text-zinc-500">Loading…</p>
      ) : editing ? (
        <FacilityForm
          initial={data.current}
          submitLabel="Submit for review"
          pending={propose.isPending}
          error={propose.error}
          onCancel={() => setEditing(false)}
          onSubmit={(values) => propose.mutate(values, { onSuccess: () => setEditing(false) })}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPills facility={data} />
            <Button variant="primary" onClick={() => setEditing(true)}>Propose a change</Button>
          </div>

          {can(me.data, 'facilities.edit') && <TodayEditor facilityId={data.id} />}

          {propose.isSuccess && <Alert>{propose.data?.status === 'approved' ? 'Saved. The change is live.' : 'Change submitted. It goes live after another reviewer approves it.'}</Alert>}

          <KeyValueList
            rows={[
              ['Address', [data.address, data.city, data.region].filter(Boolean).join(', ') || '—'],
              ['Contacts', data.current.contacts.map((contact) => contact.value).join(', ') || '—'],
              ['Services', data.current.services.join(', ') || '—'],
              ['Sources', data.sources?.join(', ') || 'manual entry'],
              ['Last verified', data.verified_at ? `${formatDay(data.verified_at)} · ${data.verification_method ?? ''}${data.verified_by ? ` · ${data.verified_by}` : ''}` : 'never'],
              ['Assigned staff', data.staff.map((member) => member.name).join(', ') || 'none'],
            ]}
          />

          {canReview && <ReviewActions facility={data} />}

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Change requests</h3>
            {data.change_requests.length === 0 && <p className="text-zinc-500">No change requests yet.</p>}
            <ul className="space-y-3">
              {data.change_requests.map((request) => (
                <li key={request.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>{request.submitted_by ?? 'Unknown'} · {formatDate(request.submitted_at)}</span>
                    <Pill tone={request.status === 'approved' ? 'emerald' : request.status === 'submitted' ? 'amber' : 'zinc'}>{request.status}</Pill>
                  </div>
                  <ChangeDiff changes={request.changes} />
                  {request.reason && <p className="text-xs text-zinc-500">Reason: {request.reason}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </SlideOver>
  );
}
