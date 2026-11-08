import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';

export type IssueKey = 'missing_coordinates' | 'outside_area' | 'no_contact' | 'no_hours' | 'no_services' | 'stale' | 'not_verified' | 'possible_duplicate';

export type QualityReport = {
  summary: Record<IssueKey, { label: string; why: string; count: number }>;
  facilities: Array<{ id: string; name: string; city: string | null; region: string | null; published: boolean; issues: IssueKey[]; duplicate_of: { id: string; name: string } | null }>;
  total: number;
  complete: number;
};

export function useDataQuality(scope: Record<string, string>) {
  const query = new URLSearchParams(scope);

  return useQuery({ queryKey: ['data-quality', scope], queryFn: () => apiRequest<QualityReport>(`/admin/data-quality?${query}`), placeholderData: keepPreviousData });
}
