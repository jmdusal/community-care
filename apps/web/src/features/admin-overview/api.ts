import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';

import { type Scope, scopeParams } from '../../lib/scope';

export type { Scope };

export type DashboardStats = {
  scope: { type: 'all' | 'region' | 'facility'; id: string | null; name: string };
  days: number;
  totals: { facilities: number; published: number; pending_changes: number; stale: number };
  verification: Record<'draft' | 'pending_review' | 'verified' | 'rejected' | 'stale', number>;
  freshness: { under_90: number; from_90_to_180: number; over_180: number; never: number };
  traceable_source_pct: number | null;
  usage: {
    searches: number;
    profile_views: number;
    call_clicks: number;
    directions_clicks: number;
    search_to_profile_pct: number | null;
    series: Array<{ date: string; searches: number; profile_views: number }>;
  };
  needs_attention: Array<{ id: string; facility: { id: string; name: string }; origin: string; fields: string[]; submitted_by: string | null; submitted_at: string }>;
  recent_imports: Array<{ id: string; source: string; filename: string; status: string; created_at: string }>;
  recent_activity: Array<{ action: string; actor: string; resource_type: string; resource_id: string | null; created_at: string }>;
};

export function useStats(scope: Scope, days: number, enabled = true) {
  const params = scopeParams(scope);
  const query = new URLSearchParams({ days: String(days), ...params });

  return useQuery({
    queryKey: ['stats', params, days],
    queryFn: () => apiRequest<DashboardStats>(`/admin/stats?${query}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Chart and state colors, validated with the dataviz palette checks (light and dark). */
export const chartColors = {
  searches: { light: '#0d9488', dark: '#0d9488' },
  profileViews: { light: '#eb6834', dark: '#d95926' },
};

/** Reserved status colors: always shown with a text label, never color alone. */
export const statusColors = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
  neutral: '#a1a1aa',
};
