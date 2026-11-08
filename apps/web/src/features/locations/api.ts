import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';

export type Level = 'region' | 'province' | 'city' | 'barangay';

export type Area = {
  code: string;
  name: string;
  kind: string | null;
  is_district: boolean | null;
  /** City independent of any province (HUC/ICC), listed under the province it sits in. */
  independent?: boolean;
  facilities: number;
  verified: number;
  missing_coordinates: number;
};

/** Facility coverage for one PSGC level under a parent area. */
export function useCoverage(level: Level, parentCode: string | null) {
  return useQuery({
    queryKey: ['coverage', level, parentCode],
    queryFn: () => apiRequest<Area[]>(`/admin/locations/coverage?level=${level}${parentCode ? `&parent_code=${parentCode}` : ''}`),
    enabled: level === 'region' || parentCode !== null,
  });
}

export type MapLevel = 'region' | 'province' | 'city' | 'barangay';

export type AreaMapData = {
  area: { code: string; name: string; level: MapLevel };
  /** null when OpenStreetMap could not place the area (or its parents). */
  map: {
    center: { lat: number; lng: number };
    /** [south, west, north, east] */
    bbox: [number, number, number, number];
    boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
    /** true when the area itself was not found and its parent is shown instead. */
    approximate: boolean;
    source: string;
  } | null;
  facilities: Array<{ id: string; name: string; lat: number; lng: number; verification_status: string; published: boolean }>;
};

/** Position, boundary and facilities of one PSGC area. Looked up once on the server, then cached. */
export function useAreaMap(level: MapLevel, code: string) {
  return useQuery({
    queryKey: ['area-map', level, code],
    queryFn: () => apiRequest<AreaMapData>(`/admin/locations/map?level=${level}&code=${code}`),
    staleTime: 10 * 60_000,
  });
}
