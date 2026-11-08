import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiList, apiRaw, apiRequest } from '../../lib/api';

export type BatchStatus = 'queued' | 'running' | 'needs_review' | 'ready_to_publish' | 'published' | 'failed';
export type ImportStep = 'acquire' | 'stage' | 'normalize' | 'match' | 'flag' | 'review' | 'publish';

export type ImportBatch = {
  id: string;
  source: string;
  kind: 'facilities' | 'geography';
  source_version: string | null;
  original_filename: string;
  usage_terms: string;
  status: BatchStatus;
  current_step: ImportStep;
  records_processed: number;
  counts: Record<string, number> | null;
  pending_flagged?: number;
  error: string | null;
  started_by?: string | null;
  published_by?: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  published_at: string | null;
};

export type ImportFlagItem = { code: string; label: string; detail: string | null };

export type StagingRecord = {
  id: number;
  row_number: number;
  source_record_id: string | null;
  match_status: 'new' | 'updated' | 'unchanged' | 'invalid';
  is_flagged: boolean;
  flags: ImportFlagItem[];
  decision: 'pending' | 'approved' | 'rejected';
  decision_reason: string | null;
  record: { name: string | null; type: string | null; address: string | null; city_code: string | null; latitude: number | null; longitude: number | null };
  matched_facility: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
  duplicates: Array<{ facility_id: string; name: string; score: number }>;
};

export type ImportSource = { key: string; label: string; kind: 'facilities' | 'geography' };

const isActive = (status?: BatchStatus) => status === 'queued' || status === 'running';

export function useBatches() {
  return useQuery({
    queryKey: ['import-batches'],
    queryFn: () => apiList<ImportBatch>('/admin/import-batches?per_page=50'),
    refetchInterval: (query) => (query.state.data?.data.some((batch) => isActive(batch.status)) ? 3000 : false),
  });
}

export function useBatch(id: string | null) {
  return useQuery({
    queryKey: ['import-batch', id],
    queryFn: () => apiRequest<ImportBatch>(`/admin/import-batches/${id}`),
    enabled: id !== null,
    refetchInterval: (query) => (isActive(query.state.data?.status) ? 2000 : false),
  });
}

export function useRecords(batchId: string | null, filter: 'flagged' | 'all', page: number) {
  const query = filter === 'flagged' ? '&flagged=1' : '';

  return useQuery({
    queryKey: ['import-records', batchId, filter, page],
    queryFn: () => apiList<StagingRecord>(`/admin/import-batches/${batchId}/records?page=${page}&per_page=${PAGE_SIZE}${query}`),
    enabled: batchId !== null,
  });
}

export function useSources() {
  return useQuery({ queryKey: ['import-sources'], queryFn: () => apiRequest<ImportSource[]>('/admin/import-sources'), staleTime: Infinity });
}

function useInvalidateImports() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['import-batches'] });
    void queryClient.invalidateQueries({ queryKey: ['import-batch'] });
    void queryClient.invalidateQueries({ queryKey: ['import-records'] });
  };
}

export function useStartImport() {
  const invalidate = useInvalidateImports();

  return useMutation({
    meta: { success: 'Import started. Records appear for review as they are processed.', error: 'Could not start the import' },
    mutationFn: (form: FormData) => apiRequest<ImportBatch>('/admin/import-batches', { method: 'POST', body: form }),
    onSuccess: invalidate,
  });
}

export function useDecide(batchId: string) {
  const invalidate = useInvalidateImports();

  return useMutation({
    meta: { success: (_d, v) => ((v as { decision: string }).decision === 'approved' ? 'Record approved' : 'Record rejected'), error: 'Could not save the decision' },
    mutationFn: ({ recordId, decision, reason }: { recordId: number; decision: 'approved' | 'rejected'; reason?: string }) =>
      apiRequest<StagingRecord>(`/admin/import-batches/${batchId}/records/${recordId}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),
    onSuccess: invalidate,
  });
}

export function usePublish(batchId: string) {
  const invalidate = useInvalidateImports();

  return useMutation({
    meta: { success: 'Approved records published', error: 'Could not publish' },
    mutationFn: () => apiRaw<{ data: ImportBatch; meta: { result: Record<string, number> } }>(`/admin/import-batches/${batchId}/publish`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}
