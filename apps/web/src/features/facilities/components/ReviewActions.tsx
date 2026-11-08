import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { Select } from '../../../components/ui/Select';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { type AdminFacilityDetail, useReverify, useSetPublication } from '../api';

const METHODS = [
  { value: 'phone_call', label: 'Phone call to the facility' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'official_source', label: 'Checked an official source' },
  { value: 'facility_confirmation', label: 'Facility confirmed in writing' },
];

/** Verifier-only actions: confirm the record is still correct; withdraw or restore it publicly. */
export function ReviewActions({ facility }: { facility: AdminFacilityDetail }) {
  const reverify = useReverify(facility.id);
  const publication = useSetPublication(facility.id);
  const [method, setMethod] = useState(METHODS[0].value);
  const [reason, setReason] = useState('');
  const withdrawn = facility.publication_status === 'withdrawn';
  const error = [reverify.error, publication.error].find((value) => value instanceof ApiError) as ApiError | undefined;

  return (
    <div className="space-y-4 rounded-control border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-end gap-2">
        <Select aria-label="How was it checked" className="flex-1" value={method} options={METHODS} onChange={(event) => setMethod(event.target.value)} />
        <Button variant="brand" disabled={reverify.isPending} onClick={() => reverify.mutate({ method })}>Confirm still correct</Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <input aria-label="Reason" placeholder={withdrawn ? 'Reason to restore' : 'Reason to withdraw (e.g. facility closed)'} className={cx(inputClass, 'flex-1')} value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button variant={withdrawn ? 'secondary' : 'danger'} disabled={reason.trim() === '' || publication.isPending} onClick={() => publication.mutate({ status: withdrawn ? 'published' : 'withdrawn', reason }, { onSuccess: () => setReason('') })}>
          {withdrawn ? 'Restore to directory' : 'Withdraw from directory'}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-700">{error.body.message}</p>}
    </div>
  );
}
