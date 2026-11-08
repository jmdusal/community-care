import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './api';

/** "Today at this facility", as staff posted it (cleared each day). */
export type TodayStatus = {
  date: string;
  doctor: 'in' | 'out' | null;
  opening: 'open' | 'closing_early' | 'closed' | null;
  closes_at: string | null;
  out_of_stock: string[];
  note: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

export type TodayInput = Pick<TodayStatus, 'doctor' | 'opening' | 'closes_at' | 'out_of_stock' | 'note'>;

export function useTodayStatus(facilityId: string | null) {
  return useQuery({ queryKey: ['facility-today', facilityId], queryFn: () => apiRequest<TodayStatus | null>(`/admin/facilities/${facilityId}/today`), enabled: facilityId !== null });
}

export function useSaveToday(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Today’s status is on the public page', error: 'Could not save today’s status' },
    mutationFn: (input: TodayInput) => apiRequest<TodayStatus>(`/admin/facilities/${facilityId}/today`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (data) => queryClient.setQueryData(['facility-today', facilityId], data),
  });
}

export const REPORT_REASONS = [
  { value: 'phone_wrong', label: 'Phone number does not work' },
  { value: 'wrong_hours', label: 'Opening hours are wrong' },
  { value: 'closed_permanently', label: 'Closed for good' },
  { value: 'wrong_location', label: 'Location or address is wrong' },
  { value: 'wrong_services', label: 'Services are wrong' },
  { value: 'other', label: 'Something else' },
] as const;

export function useReportFacility(facilityId: string) {
  return useMutation({
    mutationFn: (input: { reason: string; details?: string; contact?: string }) =>
      apiRequest<{ id: string; message: string }>(`/facilities/${facilityId}/reports`, { method: 'POST', body: JSON.stringify(input) }),
  });
}

/** "8:12 AM" in Philippine time. */
export function clockTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }) : '';
}

/** "15:00" → "3:00 PM". */
export function hhmm(time: string | null): string {
  if (!time) {
    return '';
  }
  const [h, m] = time.split(':').map(Number);

  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
