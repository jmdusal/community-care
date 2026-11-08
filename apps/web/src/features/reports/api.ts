import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';

export type UsageEvent = 'search' | 'profile_view' | 'call_click' | 'directions_click';

export type Report = {
  range: { from: string; to: string; days: number };
  appointments: {
    total: number;
    by_status: Record<'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show', number>;
    by_source: Record<'online' | 'guest' | 'staff', number>;
    attendance_rate: number | null;
    top_facilities: Array<{ id: string; name: string; appointments: number; completed: number; no_show: number; not_held: number }>;
  };
  usage: { totals: Record<UsageEvent, number | null>; searches_counted: boolean };
  by_day: Array<{ date: string; appointments: number } & Record<UsageEvent, number>>;
};

export type Range = { from: string; to: string };

/** "YYYY-MM-DD" for today minus n days, in Philippine time. */
export function manilaDate(daysAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

export function useReport(range: Range, scope: Record<string, string>) {
  const params = new URLSearchParams({ ...range, ...scope });

  return useQuery({ queryKey: ['reports', range, scope], queryFn: () => apiRequest<Report>(`/admin/reports?${params}`), placeholderData: keepPreviousData });
}

/** A plain link: the browser downloads the CSV with the signed-in session cookie. */
export function exportUrl(dataset: 'appointments' | 'facilities' | 'daily', range: Range, scope: Record<string, string>): string {
  return `/api/v1/admin/reports/export?${new URLSearchParams({ dataset, ...range, ...scope })}`;
}
