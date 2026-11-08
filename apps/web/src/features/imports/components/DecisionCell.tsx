import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { inputBase } from '../../../components/ui/Field';
import { Pill } from '../../../components/ui/Pill';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { type StagingRecord, useDecide } from '../api';

/** Approve / reject (with a required reason) for one staged record, or its recorded decision. */
export function DecisionCell({ batchId, record, reviewable }: { batchId: string; record: StagingRecord; reviewable: boolean }) {
  const decide = useDecide(batchId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (record.decision !== 'pending' || !reviewable) {
    return (
      <span className="text-xs text-zinc-500">
        {record.decision === 'pending' ? '—' : <Pill tone={record.decision === 'approved' ? 'emerald' : 'zinc'}>{record.decision}</Pill>}
        {record.decision_reason && <span className="mt-1 block text-[11px]">{record.decision_reason}</span>}
      </span>
    );
  }

  if (rejecting) {
    return (
      <form
        className="flex flex-col items-end gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          decide.mutate({ recordId: record.id, decision: 'rejected', reason });
        }}
      >
        <input autoFocus required aria-label="Reason for rejecting" placeholder="Reason" className={cx(inputBase, 'h-7 w-40 text-xs')} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="flex gap-1.5">
          <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRejecting(false)}>Cancel</Button>
          <Button type="submit" className="h-7 text-xs" disabled={decide.isPending}>Reject</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button className="h-7 w-20 text-xs" onClick={() => setRejecting(true)}>Reject</Button>
      <Button variant="brand" className="h-7 w-20 text-xs" disabled={decide.isPending} onClick={() => decide.mutate({ recordId: record.id, decision: 'approved' })}>
        Approve
      </Button>
      {decide.error instanceof ApiError && <span className="text-[11px] text-rose-700">{decide.error.body.message}</span>}
    </div>
  );
}
