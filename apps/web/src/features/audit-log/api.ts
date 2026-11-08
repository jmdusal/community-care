import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiList } from '../../lib/api';

export type AuditEntry = {
  id: number;
  created_at: string;
  actor: string;
  action: string;
  category: string;
  resource_type: string;
  resource_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_masked: string | null;
  request_id: string | null;
};

export type AuditFilters = { q?: string; category?: string; from?: string; to?: string; page: number; resource_type?: string; resource_id?: string };

export const CATEGORIES = [
  { value: 'facility', label: 'Facilities' },
  { value: 'import', label: 'Imports' },
  { value: 'user', label: 'Access' },
  { value: 'settings', label: 'Settings' },
];

export function useAuditLogs(filters: AuditFilters) {
  const query = new URLSearchParams({ page: String(filters.page), per_page: String(PAGE_SIZE) });
  Object.entries(filters).forEach(([key, value]) => key !== 'page' && value && query.set(key, String(value)));

  return useQuery({ queryKey: ['audit-logs', filters], queryFn: () => apiList<AuditEntry>(`/admin/audit-logs?${query}`), placeholderData: keepPreviousData });
}
