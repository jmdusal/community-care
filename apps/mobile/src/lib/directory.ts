import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, type Paginated } from './api';
import type { TodayStatus } from './today';

export type AreaRef = { code: string; name: string } | null;

export type Verification = { status: string; verified_at: string | null; is_stale: boolean; notice: string };

export type FacilitySummary = {
  id: string;
  name: string;
  type: { slug: string; name: string } | null;
  address: string | null;
  location: { region: AreaRef; province: AreaRef; city: AreaRef; barangay: AreaRef };
  coordinates: { lat: number; lng: number } | null;
  distance_km?: number;
  verification: Verification;
  services: { slug: string; name: string }[];
};

export type FacilityDetail = FacilitySummary & {
  contacts: { type: string; value: string }[];
  hours: { day_of_week: number; opens_at: string; closes_at: string }[];
  hour_exceptions: { date: string; is_closed: boolean; opens_at: string | null; closes_at: string | null; reason: string | null }[];
  sources: { name: string; checked_at: string | null }[];
  /** Online appointment requests are open at this facility. */
  booking_enabled?: boolean;
  programs?: { id: string; title: string; category: string; starts_on: string; ends_on: string | null }[];
  /** What staff posted today (null when nothing today). */
  today?: TodayStatus | null;
};

export type Search = { q?: string; service?: string; region?: string; city?: string; barangay?: string; lat?: number; lng?: number; radiusKm?: number };

export function useFacilitySearch(search: Search) {
  const query = new URLSearchParams({ per_page: '30' });
  if (search.q) {
    query.set('q', search.q);
  }
  if (search.service) {
    query.set('service', search.service);
  }
  if (search.region) {
    query.set('region_code', search.region);
  }
  if (search.city) {
    query.set('city_code', search.city);
  }
  if (search.barangay) {
    query.set('barangay_code', search.barangay);
  }
  if (search.lat !== undefined && search.lng !== undefined) {
    query.set('lat', String(search.lat));
    query.set('lng', String(search.lng));
    query.set('radius_km', String(search.radiusKm ?? 10));
  }

  return useQuery({
    queryKey: ['search', search],
    queryFn: () => apiGet<Paginated<FacilitySummary>>(`/facilities?${query}`),
    placeholderData: keepPreviousData,
  });
}

export function useFacility(id: string) {
  return useQuery({ queryKey: ['facility', id], queryFn: async () => (await apiGet<{ data: FacilityDetail }>(`/facilities/${id}`)).data });
}

export function useRegions() {
  return useQuery({ queryKey: ['regions'], queryFn: async () => (await apiGet<{ data: { code: string; name: string }[] }>('/locations/regions')).data, staleTime: Infinity });
}

/** Anonymous call / directions counts (fire and forget). */
export function recordEvent(id: string, event: 'call_click' | 'directions_click'): void {
  apiPost(`/facilities/${id}/events`, { event });
}

export type ServiceItem = { slug: string; name: string; facilities: number };

/** The service catalog (for the popular-service shortcuts on the search screen). */
export function useServices() {
  return useQuery({ queryKey: ['services'], queryFn: async () => (await apiGet<{ data: ServiceItem[] }>('/services')).data, staleTime: 10 * 60_000 });
}
