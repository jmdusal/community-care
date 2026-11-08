import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ApiError } from '../../../lib/api';
import { type ImportBatch, usePublish } from '../api';

/** Publish action for a reviewed facility batch; disabled until no flagged record is pending. */
export function PublishBar({ batch }: { batch: ImportBatch }) {
  const publish = usePublish(batch.id);
  const pending = batch.pending_flagged ?? 0;
  const canPublish = batch.kind === 'facilities' && (batch.status === 'ready_to_publish' || batch.status === 'needs_review');

  if (!canPublish) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="brand" disabled={pending > 0 || publish.isPending} onClick={() => publish.mutate()}>
        <Icon name="check" /> {publish.isPending ? 'Publishing…' : 'Publish to directory'}
      </Button>
      {pending > 0 && <span className="text-xs text-amber-700 dark:text-amber-400">Decide the {pending} flagged record(s) below first.</span>}
      {publish.error instanceof ApiError && <span className="text-xs text-rose-700">{publish.error.body.message}</span>}
    </div>
  );
}
