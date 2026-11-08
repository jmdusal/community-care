import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiList, apiRequest } from '../../lib/api';
import type { TodayStatus } from '../../lib/today';

export { type CatalogItem, type Place, useBarangays, useCities, useFacilityTypes, useRegions, useServices } from '../../lib/catalog';

export type AreaRef = { code: string; name: string } | null;

export type Verification = {
  status: 'draft' | 'pending_review' | 'verified' | 'rejected' | 'stale';
  verified_at: string | null;
  is_stale: boolean;
  notice: string;
};

export type FacilitySummary = {
  id: string;
  name: string;
  type: { slug: string; name: string } | null;
  address: string | null;
  location: { region: AreaRef; province: AreaRef; city: AreaRef; barangay: AreaRef };
  coordinates: { lat: number; lng: number } | null;
  distance_km?: number;
  verification: Verification;
  source: { name: string; checked_at: string | null } | null;
  services: Array<{ slug: string; name: string; category: string; availability: string }>;
};

export type FacilityDetail = FacilitySummary & {
  contacts: Array<{ type: 'phone' | 'email' | 'website' | string; value: string }>;
  hours: Array<{ day_of_week: number; opens_at: string; closes_at: string; notes: string | null }>;
  hour_exceptions: Array<{ date: string; is_closed: boolean; opens_at: string | null; closes_at: string | null; reason: string | null }>;
  sources: Array<{ name: string; url: string | null; checked_at: string | null }>;
  /** Online appointment requests are open (pilot switch on and facility opted in). */
  booking_enabled?: boolean;
  /** Current health programs this facility takes part in. */
  programs?: Array<{ id: string; title: string; category: string; starts_on: string; ends_on: string | null }>;
  /** What staff posted today (null when nothing today). */
  today?: TodayStatus | null;
};

export type SearchParams = {
  q?: string;
  region?: string;
  city?: string;
  type?: string;
  service?: string;
  verified?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
};

function toQueryString(params: SearchParams): string {
  const query = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => value !== undefined && value !== '' && query.set(key, String(value));

  set('q', params.q);
  set('region_code', params.region);
  set('city_code', params.city);
  set('type', params.type);
  set('service', params.service);
  if (params.verified) {
    query.set('verified_only', '1');
  }
  set('lat', params.lat);
  set('lng', params.lng);
  if (params.lat !== undefined) {
    set('radius_km', params.radius ?? 10);
  }
  set('page', params.page);

  return query.toString();
}

export function useFacilitySearch(params: SearchParams) {
  return useQuery({
    queryKey: ['facility-search', params],
    queryFn: () => apiList<FacilitySummary>(`/facilities?${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useFacility(id: string) {
  return useQuery({ queryKey: ['facility', id], queryFn: () => apiRequest<FacilityDetail>(`/facilities/${id}`) });
}

/** Anonymous click counts (call / directions). Failures are ignored on purpose. */
export function recordFacilityEvent(id: string, event: 'call_click' | 'directions_click'): void {
  void apiRequest(`/facilities/${id}/events`, { method: 'POST', body: JSON.stringify({ event }) }).catch(() => undefined);
}
