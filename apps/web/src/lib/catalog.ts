import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiList, apiRequest } from './api';

/**
 * Shared reference data (PSGC places, service and facility-type catalogs).
 * Used by the public directory and the admin screens alike.
 */
export type Place = { code: string; name: string };
export type CatalogItem = { slug: string; name: string; facilities: number; category?: string; archived?: boolean };

export function useRegions() {
  return useQuery({ queryKey: ['regions'], queryFn: () => apiRequest<Place[]>('/locations/regions'), staleTime: Infinity });
}

export function useCities(regionCode: string | undefined) {
  return useQuery({
    queryKey: ['cities', regionCode],
    queryFn: () => apiRequest<Place[]>(`/locations/cities?region_code=${regionCode}`),
    enabled: regionCode !== undefined,
    staleTime: Infinity,
  });
}

export function useBarangays(cityCode: string | undefined) {
  return useQuery({
    queryKey: ['barangays', cityCode],
    queryFn: () => apiRequest<Place[]>(`/locations/barangays?city_code=${cityCode}`),
    enabled: cityCode !== undefined,
    staleTime: Infinity,
  });
}

/**
 * The service catalog. Public filters get only active services; admin forms pass
 * withArchived so archived services a facility still lists keep their names.
 */
export function useServices(withArchived = false) {
  return useQuery({ queryKey: ['services', withArchived], queryFn: () => apiRequest<CatalogItem[]>(`/services${withArchived ? '?with_archived=1' : ''}`), staleTime: 5 * 60_000 });
}

export function useFacilityTypes(withArchived = false) {
  return useQuery({ queryKey: ['facility-types', withArchived], queryFn: () => apiRequest<CatalogItem[]>(`/facility-types${withArchived ? '?with_archived=1' : ''}`), staleTime: 5 * 60_000 });
}

export type FacilityOption = { id: string; name: string; city: string | null };

/**
 * Admin facility lookup for pickers: the first matches A–Z, or all facilities (first page)
 * when the search is empty, optionally limited to a scope (facility_id or region_code).
 * Staff only ever see their assigned facilities.
 */
export function useFacilityOptions(query: string, enabled = true, scope: Record<string, string> = {}) {
  const params = new URLSearchParams({ per_page: '30', ...scope });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  return useQuery({
    queryKey: ['facility-options', query.trim(), scope],
    queryFn: () => apiList<FacilityOption>(`/admin/facilities?${params}`),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
