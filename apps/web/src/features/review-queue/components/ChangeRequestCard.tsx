import { useState } from 'react';
import { ChangeDiff } from '../../../components/shared/ChangeDiff';
import { Button } from '../../../components/ui/Button';
import { inputBase } from '../../../components/ui/Field';
import { Pill } from '../../../components/ui/Pill';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { formatDate } from '../../../lib/format';
import type { ChangeRequest } from '../../facilities/api';
import { useApprove, useReject, useWithdraw } from '../api';

/**
 * One proposal with its before/after diff. Four-eyes is visible in the UI:
 * on your own request you can only withdraw (the API enforces it as well).
 */
export function ChangeRequestCard({ request, canReview }: { request: ChangeRequest; canReview: boolean }) {
  const approve = useApprove();
  const reject = useReject();
  const withdraw = useWithdraw();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const error = [approve.error, reject.error, withdraw.error].find((value) => value instanceof ApiError) as ApiError | undefined;
  const pending = request.status === 'submitted';

  return (
    <article className="space-y-3 rounded-card border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-zinc-900 dark:text-white">{request.facility?.name}</h2>
          <p className="text-xs text-zinc-500">
            {request.submitted_by ?? 'Unknown'} · {formatDate(request.submitted_at)}
            {request.reviewed_by && ` · ${request.status} by ${request.reviewed_by}`}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Pill tone={request.origin === 'create' ? 'sky' : 'violet'}>{request.origin === 'create' ? 'New facility' : 'Edit'}</Pill>
          {!pending && <Pill tone={request.status === 'approved' ? 'emerald' : 'zinc'}>{request.status}</Pill>}
        </div>
      </header>

      {request.note && <p className="rounded-control bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">“{request.note}”</p>}
      <ChangeDiff changes={request.changes} />
      {request.reason && <p className="text-xs text-zinc-500">Reason: {request.reason}</p>}

      {pending && (
        <footer className="flex flex-wrap items-center justify-end gap-2">
          {request.is_own ? (
            <>
              <span className="mr-auto text-xs text-zinc-500">You submitted this. Another reviewer must approve it.</span>
              <Button disabled={withdraw.isPending} onClick={() => withdraw.mutate({ id: request.id })}>Withdraw</Button>
            </>
          ) : canReview && rejecting ? (
            <form className="flex w-full flex-wrap justify-end gap-2" onSubmit={(event) => { event.preventDefault(); reject.mutate({ id: request.id, reason }); }}>
              <input autoFocus required aria-label="Reason for rejecting" placeholder="Reason (shown to the submitter)" className={cx(inputBase, 'min-w-56 flex-1')} value={reason} onChange={(event) => setReason(event.target.value)} />
              <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={reject.isPending}>Reject</Button>
            </form>
          ) : canReview ? (
            <>
              <Button onClick={() => setRejecting(true)}>Reject</Button>
              <Button variant="brand" disabled={approve.isPending} onClick={() => approve.mutate({ id: request.id })}>Approve and publish</Button>
            </>
          ) : (
            <span className="text-xs text-zinc-500">Waiting for a verifier.</span>
          )}
        </footer>
      )}

      {error && <p className="text-right text-xs text-rose-700">{error.body.message}</p>}
    </article>
  );
}
