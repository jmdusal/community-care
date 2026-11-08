import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { apiRaw, apiRequest } from '../../lib/api';
import type { Appointment, Slot } from '../../lib/booking';

export type View = 'requests' | 'upcoming' | 'past';
export type StaffAction = 'confirm' | 'decline' | 'cancel' | 'complete' | 'no-show';

export const ACTION_FOR_STATUS: Record<string, { action: StaffAction; label: string; variant: 'brand' | 'secondary' | 'danger'; needsReason?: boolean }> = {
  confirmed: { action: 'confirm', label: 'Confirm', variant: 'brand' },
  declined: { action: 'decline', label: 'Decline', variant: 'danger', needsReason: true },
  completed: { action: 'complete', label: 'Completed', variant: 'secondary' },
  no_show: { action: 'no-show', label: 'No-show', variant: 'secondary' },
  cancelled: { action: 'cancel', label: 'Cancel', variant: 'danger', needsReason: true },
};

type ListResponse = { data: Appointment[]; meta: { page: number; per_page: number; total: number; last_page: number; view: View; counts: Record<View, number> } };

export function useStaffAppointments(filters: { view: View; page: number; q?: string; scope: Record<string, string> }) {
  const query = new URLSearchParams({ view: filters.view, page: String(filters.page), per_page: String(PAGE_SIZE), ...filters.scope });
  if (filters.q) {
    query.set('q', filters.q);
  }

  return useQuery({ queryKey: ['staff-appointments', filters], queryFn: () => apiRaw<ListResponse>(`/admin/appointments?${query}`), placeholderData: keepPreviousData, refetchInterval: 60_000 });
}

export function useAppointmentAction() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (_d, v) => ({ confirm: 'Appointment confirmed', decline: 'Request declined', cancel: 'Appointment cancelled', complete: 'Marked as completed', 'no-show': 'Marked as missed' } as Record<string, string>)[(v as { action: string }).action] ?? 'Appointment updated', error: 'Could not update the appointment' },
    mutationFn: ({ id, action, reason }: { id: string; action: StaffAction; reason?: string }) =>
      apiRequest<Appointment>(`/admin/appointments/${id}/${action}`, { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export type BookingRuleValues = { max_active: number | null; cancel_cutoff_hours: number | null; min_notice_hours: number | null };

export type BookingRules = BookingRuleValues & {
  effective: { max_active: number; cancel_cutoff_hours: number; min_notice_hours: number };
  defaults: { max_active: number; cancel_cutoff_hours: number; min_notice_hours: number };
};

export type ScheduleMeta = {
  facility: { id: string; name: string; booking_enabled: boolean; published: boolean };
  booking_feature_enabled: boolean;
  can_enable_booking: boolean;
  rules: BookingRules;
};

export function useSchedule(facilityId: string | undefined, from: string) {
  return useQuery({
    queryKey: ['schedule', facilityId, from],
    queryFn: () => apiRaw<{ data: Slot[]; meta: ScheduleMeta }>(`/admin/facilities/${facilityId}/availability?from=${from}&days=14`),
    enabled: facilityId !== undefined,
    placeholderData: keepPreviousData,
  });
}

export type SlotInput = { from_date: string; to_date: string; weekdays: number[]; start_time: string; end_time: string; slot_minutes: number; capacity: number; service: string | null };

export function useGenerateSlots(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (d) => `${(d as { created: number }).created} appointment times added`, error: 'Could not add times' },
    mutationFn: (input: SlotInput) => apiRequest<{ created: number }>(`/admin/facilities/${facilityId}/availability`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useRemoveSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Time removed', error: 'Could not remove the time' },
    mutationFn: (slotId: string) => apiRaw<null>(`/admin/availability/${slotId}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export function useBookingSwitch(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (_d, v) => (v ? 'Online booking turned on' : 'Online booking turned off'), error: 'Could not change online booking' },
    mutationFn: (enabled: boolean) => apiRequest<{ booking_enabled: boolean }>(`/admin/facilities/${facilityId}/booking`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export type StaffBookingInput = { slot_id: string; name: string; mobile?: string; email?: string };

/** The clinic books a walk-in or phone caller (confirmed at once). One key per form, so a retry never books twice. */
export function useStaffBooking(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Appointment booked and confirmed', error: 'Could not book the appointment' },
    mutationFn: ({ input, idempotencyKey }: { input: StaffBookingInput; idempotencyKey: string }) =>
      apiRequest<Appointment>(`/admin/facilities/${facilityId}/appointments`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

/** This facility's own booking rules (null = use the system default). */
export function useSaveBookingRules(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Booking rules saved', error: 'Could not save the booking rules' },
    mutationFn: (input: BookingRuleValues) => apiRequest<BookingRules>(`/admin/facilities/${facilityId}/booking-rules`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schedule'] }),
  });
}

export type QueueStatus = 'waiting' | 'called' | 'serving' | 'done' | 'skipped';

export type QueueTicket = {
  id: string;
  number: string;
  name: string | null;
  mobile: string | null;
  service: { slug: string; name: string } | null;
  /** Set for booked patients who checked in with their QR code; null for walk-ins. */
  appointment: { id: string; reference_code: string; starts_at: string } | null;
  status: QueueStatus;
  counter: string | null;
  called_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type QueueDisplay = { now_serving: Array<{ number: string; counter: string | null; status: string }>; waiting: number; next: string[] };

type QueueResponse = { data: QueueTicket[]; meta: { date: string; counts: Record<QueueStatus, number>; display: QueueDisplay } };

/** Today's walk-in queue; refreshes every 5 seconds so several staff stay in step. */
export function useQueue(facilityId: string) {
  return useQuery({ queryKey: ['queue', facilityId], queryFn: () => apiRaw<QueueResponse>(`/admin/facilities/${facilityId}/queue`), refetchInterval: 5_000 });
}

export function useAddWalkIn(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (data) => `Walk-in added: number ${(data as QueueTicket).number}`, error: 'Could not add the walk-in' },
    mutationFn: (input: { name?: string; mobile?: string; service?: string }) => apiRequest<QueueTicket>(`/admin/facilities/${facilityId}/queue`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['queue', facilityId] }),
  });
}

export type CheckInResult = {
  ticket: QueueTicket;
  appointment: { id: string; reference_code: string; name: string | null; starts_at: string; arrived_at: string | null };
  already_checked_in: boolean;
};

/** Desk check-in: the reference code from the patient's QR (or typed). Errors are shown in the check-in window. */
export function useCheckIn(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => apiRequest<CheckInResult>(`/admin/facilities/${facilityId}/check-in`, { method: 'POST', body: JSON.stringify({ code }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['queue', facilityId] });
      void queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    },
  });
}

export function useCallNext(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: (data) => `Calling number ${(data as QueueTicket).number}`, error: 'Could not call the next number' },
    mutationFn: (counter: string) => apiRequest<QueueTicket>(`/admin/facilities/${facilityId}/queue/call-next`, { method: 'POST', body: JSON.stringify(counter ? { counter } : {}) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['queue', facilityId] }),
  });
}

export type QueueAction = 'call' | 'serve' | 'done' | 'skip' | 'requeue';

export function useMoveTicket(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { error: 'Could not update the number' },
    mutationFn: ({ id, action, counter }: { id: string; action: QueueAction; counter?: string }) =>
      apiRequest<QueueTicket>(`/admin/queue/${id}/${action}`, { method: 'POST', body: JSON.stringify(counter ? { counter } : {}) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['queue', facilityId] }),
  });
}

/** Every appointment in one month (Philippine dates) for the calendar, following the top-bar scope. */
export function useCalendar(month: string, scope: Record<string, string>) {
  const params = new URLSearchParams({ month, ...scope });

  return useQuery({
    queryKey: ['staff-appointments', 'calendar', month, scope],
    queryFn: () => apiRaw<{ data: Appointment[]; meta: { total: number; truncated: boolean } }>(`/admin/appointments/calendar?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
