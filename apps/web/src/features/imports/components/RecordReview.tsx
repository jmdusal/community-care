import { useState } from 'react';
import { Pagination } from '../../../components/ui/Pagination';
import { Pill } from '../../../components/ui/Pill';
import { Segmented } from '../../../components/ui/Segmented';
import { type ImportBatch, type StagingRecord, useRecords } from '../api';
import { matchPill } from '../presentation';
import { DecisionCell } from './DecisionCell';
import { FlagList } from './FlagList';

function RecordRow({ batchId, record, reviewable }: { batchId: string; record: StagingRecord; reviewable: boolean }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{record.row_number}</td>
      <td className="min-w-[180px] px-3 py-3">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">{record.record.name ?? <em className="text-rose-700">No name</em>}</div>
        <div className="text-xs text-zinc-500">
          {record.source_record_id ?? 'no source ID'} · {record.record.type ?? 'type not given'}
        </div>
        {record.matched_facility && <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Matches: {record.matched_facility.name}</div>}
      </td>
      <td className="px-3 py-3"><Pill tone={matchPill[record.match_status]}>{record.match_status}</Pill></td>
      <td className="min-w-[180px] px-3 py-3"><FlagList record={record} /></td>
      <td className="px-4 py-3 text-right"><DecisionCell batchId={batchId} record={record} reviewable={reviewable} /></td>
    </tr>
  );
}

/** Staged records of a batch, flagged-first, with per-record decisions. */
export function RecordReview({ batch }: { batch: ImportBatch }) {
  const [filter, setFilter] = useState<'flagged' | 'all'>('flagged');
  const [page, setPage] = useState(1);
  const records = useRecords(batch.id, filter, page);
  const reviewable = batch.status === 'needs_review' || batch.status === 'ready_to_publish';

  return (
    <div className="overflow-hidden rounded-card border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <Segmented
          label="Records to show"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[{ value: 'flagged', label: 'Flagged' }, { value: 'all', label: 'All records' }]}
        />
        <span className="text-xs text-zinc-500">{records.data ? `${records.data.meta.total} records` : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="px-4 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Record</th>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Flags</th>
              <th className="px-4 py-2 text-right font-medium">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
            {records.data?.data.map((record) => <RecordRow key={record.id} batchId={batch.id} record={record} reviewable={reviewable} />)}
            {records.data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-zinc-500">{filter === 'flagged' ? 'No flagged records. Nothing needs a decision.' : 'No records.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {records.data && (
        <div className="border-t border-zinc-200 px-4 py-2.5 empty:hidden dark:border-zinc-800">
          <Pagination perPage={records.data.meta.per_page} page={records.data.meta.page} lastPage={records.data.meta.last_page} total={records.data.meta.total} onChange={setPage} noun="records" />
        </div>
      )}
    </div>
  );
}
