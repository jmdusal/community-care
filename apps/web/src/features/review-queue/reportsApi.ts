import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRaw, apiRequest } from '../../lib/api';

export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export type FacilityReport = {
  id: string;
  facility: { id: string; name: string };
  reason: { value: string; label: string };
  details: string | null;
  contact: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

type ReportsResponse = { data: FacilityReport[]; meta: { page: number; per_page: number; total: number; last_page: number; counts: Record<ReportStatus, number> } };

export function useFacilityReports(status: ReportStatus, page: number, scope: Record<string, string>) {
  const params = new URLSearchParams({ status, page: String(page), per_page: '10', ...scope });

  return useQuery({ queryKey: ['facility-reports', status, page, scope], queryFn: () => apiRaw<ReportsResponse>(`/admin/facility-reports?${params}`), placeholderData: keepPreviousData });
}

export function useHandleReport() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (_d, v) => ((v as { action: string }).action === 'resolve' ? 'Marked as fixed' : 'Report dismissed'), error: 'Could not update the report' },
    mutationFn: ({ id, action, note }: { id: string; action: 'resolve' | 'dismiss'; note?: string }) =>
      apiRequest<FacilityReport>(`/admin/facility-reports/${id}/${action}`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['facility-reports'] }),
  });
}
