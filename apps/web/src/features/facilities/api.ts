import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import type { FieldChange } from '../../components/shared/ChangeDiff';
import { apiList, apiRequest } from '../../lib/api';

export type VerificationStatus = 'draft' | 'pending_review' | 'verified' | 'rejected' | 'stale';

export type AdminFacility = {
  id: string;
  name: string;
  type: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  verification_status: VerificationStatus;
  publication_status: 'unpublished' | 'published' | 'withdrawn';
  verified_at: string | null;
  verification_method: string | null;
  review_notes: string | null;
  sources?: string[];
  pending_changes?: number;
  updated_at: string;
};

export type FacilityValues = {
  name: string | null;
  type: string | null;
  address: string | null;
  city_code: string | null;
  barangay_code: string | null;
  latitude: number | null;
  longitude: number | null;
  contacts: Array<{ type: string; value: string }>;
  /** 00:00–24:00 = open 24 hours; closes before opens = past midnight. */
  hours: Array<{ day_of_week: number; opens_at: string; closes_at: string }>;
  /** Holidays and one-off changes, today and later. */
  hour_exceptions: Array<{ date: string; is_closed: boolean; opens_at: string | null; closes_at: string | null; reason: string | null }>;
  services: string[];
};

export type ChangeRequest = {
  id: string;
  facility?: { id: string; name: string; publication_status: string };
  origin: 'create' | 'edit';
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn';
  changes: Record<string, FieldChange>;
  note: string | null;
  reason: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  is_own: boolean;
};

export type AdminFacilityDetail = AdminFacility & {
  current: FacilityValues;
  verified_by: string | null;
  staff: Array<{ id: string; name: string }>;
  change_requests: ChangeRequest[];
};

export type FacilityFilters = { q?: string; status?: VerificationStatus; page: number; scope?: Record<string, string> };

export function useAdminFacilities(filters: FacilityFilters) {
  const query = new URLSearchParams({ page: String(filters.page), per_page: String(PAGE_SIZE) });
  if (filters.q) {
    query.set('q', filters.q);
  }
  if (filters.status) {
    query.set('verification_status', filters.status);
  }
  Object.entries(filters.scope ?? {}).forEach(([key, value]) => query.set(key, value));

  return useQuery({
    queryKey: ['admin-facilities', filters],
    queryFn: () => apiList<AdminFacility>(`/admin/facilities?${query}`) as Promise<Awaited<ReturnType<typeof apiList<AdminFacility>>> & { meta: { status_counts: Record<string, number> } }>,
    placeholderData: keepPreviousData,
  });
}

export function useAdminFacility(id: string | null) {
  return useQuery({ queryKey: ['admin-facility', id], queryFn: () => apiRequest<AdminFacilityDetail>(`/admin/facilities/${id}`), enabled: id !== null });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () => ['admin-facilities', 'admin-facility', 'change-requests', 'stats'].forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
}

export function useProposeChange(id: string) {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: (d) => ((d as { status?: string }).status === 'approved' ? 'Facility updated' : 'Edit sent for review'), error: 'Could not save the facility' },
    mutationFn: (values: Partial<FacilityValues> & { note?: string }) => apiRequest<ChangeRequest>(`/admin/facilities/${id}`, { method: 'PATCH', body: JSON.stringify(values) }),
    onSuccess: invalidate,
  });
}

export function useCreateFacility() {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: (d) => ((d as { status?: string }).status === 'approved' ? 'Facility added' : 'New facility sent for review'), error: 'Could not add the facility' },
    mutationFn: (values: Partial<FacilityValues> & { note?: string }) => apiRequest<ChangeRequest>('/admin/facilities', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: invalidate,
  });
}

export function useReverify(id: string) {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: 'Facility re-verified', error: 'Could not re-verify' },
    mutationFn: (input: { method: string; note?: string }) => apiRequest<AdminFacility>(`/admin/facilities/${id}/reverify`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useSetPublication(id: string) {
  const invalidate = useInvalidate();

  return useMutation({
    meta: { success: (_d, v) => ((v as { status: string }).status === 'published' ? 'Facility published' : 'Facility withdrawn from the public directory'), error: 'Could not change publication' },
    mutationFn: (input: { status: 'published' | 'withdrawn'; reason: string }) => apiRequest<AdminFacility>(`/admin/facilities/${id}/publication`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}
