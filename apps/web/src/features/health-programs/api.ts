import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiRaw, apiRequest, type Paginated } from '../../lib/api';
import type { HealthProgram } from '../../lib/programs';

export type ProgramStatus = 'draft' | 'published' | 'archived';

export type ProgramInput = {
  title: string;
  category: string;
  summary: string;
  description: string;
  starts_on: string;
  ends_on: string | null;
  source_name: string | null;
  source_url: string | null;
  facility_ids: string[];
};

export function useAdminPrograms(filters: { status?: ProgramStatus; q?: string; page: number; scope: Record<string, string> }) {
  const query = new URLSearchParams({ page: String(filters.page), per_page: String(PAGE_SIZE), ...filters.scope });
  if (filters.status) {
    query.set('status', filters.status);
  }
  if (filters.q) {
    query.set('q', filters.q);
  }

  return useQuery({
    queryKey: ['admin-programs', filters],
    queryFn: () => apiRaw<Paginated<HealthProgram> & { meta: { status_counts: Partial<Record<ProgramStatus, number>> } }>(`/admin/health-programs?${query}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProgram(id: string | null) {
  return useQuery({ queryKey: ['admin-program', id], queryFn: () => apiRequest<HealthProgram>(`/admin/health-programs/${id}`), enabled: id !== null });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => ['admin-programs', 'admin-program', 'public-programs'].forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
}

export function useSaveProgram() {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: (_d, v) => ((v as { id?: string }).id ? 'Program saved' : 'Program created as a draft'), error: 'Could not save the program' },
    mutationFn: ({ id, input }: { id?: string; input: ProgramInput }) =>
      apiRequest<HealthProgram>(id ? `/admin/health-programs/${id}` : '/admin/health-programs', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useProgramStatus() {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: (_d, v) => ((v as { action: string }).action === 'publish' ? 'Program published' : 'Program archived'), error: 'Could not change the program' },
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'archive' }) => apiRequest<HealthProgram>(`/admin/health-programs/${id}/${action}`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}
