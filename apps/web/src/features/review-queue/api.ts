import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiList, apiRequest, type Paginated } from '../../lib/api';
import type { ChangeRequest } from '../facilities/api';

export type QueueStatus = ChangeRequest['status'];

export type QueueResponse = Paginated<ChangeRequest> & {
  meta: { queue?: { pending_changes: number; stale_facilities: number; flagged_import_records: number } };
};

export function useChangeRequests(status: QueueStatus, page: number, scope: Record<string, string> = {}) {
  const query = new URLSearchParams({ status, page: String(page), per_page: String(PAGE_SIZE), ...scope });

  return useQuery({
    queryKey: ['change-requests', status, page, scope],
    queryFn: () => apiList<ChangeRequest>(`/admin/change-requests?${query}`) as Promise<QueueResponse>,
    placeholderData: keepPreviousData,
  });
}

function useDecision(action: 'approve' | 'reject' | 'withdraw') {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: { approve: 'Change approved and published', reject: 'Change rejected', withdraw: 'Change withdrawn' }[action], error: 'Could not save the decision' },
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiRequest<ChangeRequest>(`/admin/change-requests/${id}/${action}`, { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) }),
    onSuccess: () => ['change-requests', 'admin-facilities', 'admin-facility', 'stats'].forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] })),
  });
}

export const useApprove = () => useDecision('approve');
export const useReject = () => useDecision('reject');
export const useWithdraw = () => useDecision('withdraw');
