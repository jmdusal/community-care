import type { FacilitySummary } from './api';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** "Barangay, City, Region" from whatever levels are known. */
export function placeLine(facility: FacilitySummary): string {
  const { barangay, city, province, region } = facility.location;

  return [barangay?.name, city?.name, province?.name ?? region?.name].filter(Boolean).join(', ');
}

/** Google Maps directions URL (a link only; no map provider is embedded). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
