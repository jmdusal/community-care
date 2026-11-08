import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';

export type Place = { code: string; name: string };

/** Cities/municipalities of a region (independent cities included), loaded only when a region is chosen. */
export function useCities(regionCode: string | undefined) {
  return useQuery({
    queryKey: ['cities', regionCode],
    queryFn: async () => (await apiGet<{ data: Place[] }>(`/locations/cities?region_code=${regionCode}`)).data,
    enabled: regionCode !== undefined,
    staleTime: Infinity,
  });
}

export function useBarangays(cityCode: string | undefined) {
  return useQuery({
    queryKey: ['barangays', cityCode],
    queryFn: async () => (await apiGet<{ data: Place[] }>(`/locations/barangays?city_code=${cityCode}`)).data,
    enabled: cityCode !== undefined,
    staleTime: Infinity,
  });
}
