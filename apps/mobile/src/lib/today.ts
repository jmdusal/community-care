import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiGet } from './api';

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
  return useQuery({
    queryKey: ['facility-today', facilityId],
    queryFn: async () => (await apiGet<{ data: TodayStatus | null }>(`/admin/facilities/${facilityId}/today`)).data,
    enabled: facilityId !== null,
  });
}

export function useSaveToday(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TodayInput) => (await apiFetch<{ data: TodayStatus }>(`/admin/facilities/${facilityId}/today`, { method: 'PUT', body: input })).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['facility-today', facilityId], data);
      void queryClient.invalidateQueries({ queryKey: ['facility', facilityId] });
    },
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
    mutationFn: (input: { reason: string; details?: string; contact?: string }) => apiFetch(`/facilities/${facilityId}/reports`, { method: 'POST', body: input }),
  });
}

export function clockTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }) : '';
}

export function hhmm(time: string | null): string {
  if (!time) {
    return '';
  }
  const [h, m] = time.split(':').map(Number);

  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
