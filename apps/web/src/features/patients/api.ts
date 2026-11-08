import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiList, apiRequest, type Paginated } from '../../lib/api';
import type { Appointment } from '../../lib/booking';

export type Patient = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  status: 'active' | 'suspended';
  two_factor: boolean;
  joined_at: string | null;
  last_active_at: string | null;
  appointments: number;
  upcoming: number | null;
  last_appointment_at: string | null;
};


type PatientsResponse = Paginated<Patient> & { meta: { can_manage: boolean } };

export function usePatients(filters: { q: string; status: string; page: number }, scope: Record<string, string>) {
  const params = new URLSearchParams({ page: String(filters.page), per_page: String(PAGE_SIZE), ...scope });
  if (filters.q.trim()) {
    params.set('q', filters.q.trim());
  }
  if (filters.status) {
    params.set('status', filters.status);
  }

  return useQuery({
    queryKey: ['patients', filters.q.trim(), filters.status, filters.page, scope],
    queryFn: () => apiList<Patient>(`/admin/patients?${params}`) as Promise<PatientsResponse>,
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => apiRequest<Omit<Patient, 'appointments'> & { appointments: Appointment[] }>(`/admin/patients/${id}`),
    enabled: id !== null,
  });
}

export function useSetPatientStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (_d, v) => (v === 'suspended' ? 'Patient account suspended' : 'Patient account reactivated'), error: 'Could not change the account' },
    mutationFn: (status: 'active' | 'suspended') => apiRequest<Patient>(`/admin/patients/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      void queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
  });
}
