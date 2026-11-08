import { Alert } from '../../../components/ui/Alert';
import { KeyValueList } from '../../../components/ui/KeyValueList';
import { Panel } from '../../../components/ui/Panel';
import { Pill } from '../../../components/ui/Pill';
import { useBatch } from '../api';
import { formatDate, statusPill } from '../presentation';
import { BatchCounts } from './BatchCounts';
import { PublishBar } from './PublishBar';
import { RecordReview } from './RecordReview';
import { Stepper } from './Stepper';

/** One batch: pipeline progress, counts, provenance, publish action and record review. */
export function BatchDetail({ id }: { id: string }) {
  const { data: batch } = useBatch(id);

  if (!batch) {
    return (
      <Panel>
        <p className="p-8 text-center text-sm text-zinc-500">Loading batch…</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-white">{batch.original_filename}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {batch.source} · {batch.source_version ?? 'no version'} · started {formatDate(batch.created_at)}
            {batch.started_by ? ` by ${batch.started_by}` : ''}
          </p>
        </div>
        <Pill tone={statusPill[batch.status].tone} dot>{statusPill[batch.status].label}</Pill>
      </div>

      <div className="space-y-6 p-5">
        <Stepper batch={batch} />
        {batch.error && <Alert tone="danger">{batch.error}</Alert>}
        <BatchCounts batch={batch} />
        <KeyValueList
          rows={[
            ['Usage terms', batch.usage_terms],
            ['Records processed', batch.records_processed.toLocaleString()],
            ['Published', batch.published_at ? `${formatDate(batch.published_at)}${batch.published_by ? ` by ${batch.published_by}` : ''}` : '—'],
          ]}
        />
        <PublishBar batch={batch} />
        {batch.kind === 'facilities' && batch.counts && <RecordReview batch={batch} />}
      </div>
    </Panel>
  );
}
