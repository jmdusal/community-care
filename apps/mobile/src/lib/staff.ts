import * as SecureStore from 'expo-secure-store';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, apiGet } from './api';
import type { CurrentUser } from './auth';
import type { Appointment } from './booking';

/**
 * Staff mode (Clinic tab): which facilities the person is looking at, and their appointments.
 * Same rules as the web console: the API only returns what the person may see.
 */
export type StaffScope = { facilityIds: string[]; name: string };

export type StaffView = 'requests' | 'upcoming' | 'past';

export type StaffAppointment = Appointment & {
  source?: 'online' | 'guest' | 'staff';
  next_actions?: string[];
  patient?: { name: string; mobile: string | null; email: string | null; account_id: string | null };
  booked_by?: string;
};

type ListResponse = { data: StaffAppointment[]; meta: { total: number; counts: Record<StaffView, number> } };

const key = (userId: string) => `communitycare.staff_scope.${userId}`;

/** The chosen facilities, remembered per person on this phone. Starts on their only facility, or all of theirs. */
export function useStaffScope(user: CurrentUser) {
  const assigned = user.facilities ?? [];
  const fallback: StaffScope = assigned.length === 1 ? { facilityIds: [assigned[0].id], name: assigned[0].name } : { facilityIds: [], name: user.sees_all_facilities ? 'All facilities' : 'All my facilities' };
  const [scope, setState] = useState<StaffScope | null>(null);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(key(user.id)).catch(() => null).then((raw) => {
      if (!active) {
        return;
      }
      try {
        const saved = raw ? (JSON.parse(raw) as StaffScope) : null;
        const allowed = new Set(assigned.map((facility) => facility.id));
        const valid = saved && (user.sees_all_facilities || saved.facilityIds.every((id) => allowed.has(id)));
        setState(valid ? saved : fallback);
      } catch {
        setState(fallback);
      }
    });

    return () => { active = false; };
    // Read once per person.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const setScope = useCallback((next: StaffScope) => {
    setState(next);
    void SecureStore.setItemAsync(key(user.id), JSON.stringify(next)).catch(() => undefined);
  }, [user.id]);

  return { scope, setScope };
}

export function useStaffAppointments(view: StaffView, scope: StaffScope | null) {
  const params = new URLSearchParams({ view, per_page: '50' });
  if (scope?.facilityIds.length) {
    params.set('facility_id', scope.facilityIds.join(','));
  }

  return useQuery({
    queryKey: ['staff-appointments', view, scope?.facilityIds.join(',') ?? ''],
    queryFn: () => apiGet<ListResponse>(`/admin/appointments?${params}`),
    enabled: scope !== null,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export type StaffAction = 'confirm' | 'decline' | 'cancel' | 'complete' | 'no-show';

/** next_actions (statuses) → the buttons staff see. Decline and cancel need a reason for the patient. */
export const ACTIONS: Record<string, { action: StaffAction; label: string; tone: 'primary' | 'secondary' | 'danger'; needsReason?: boolean }> = {
  confirmed: { action: 'confirm', label: 'Confirm', tone: 'primary' },
  completed: { action: 'complete', label: 'Completed', tone: 'secondary' },
  no_show: { action: 'no-show', label: 'No-show', tone: 'secondary' },
  declined: { action: 'decline', label: 'Decline', tone: 'danger', needsReason: true },
  cancelled: { action: 'cancel', label: 'Cancel', tone: 'danger', needsReason: true },
};

export function useStaffAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: StaffAction; reason?: string }) =>
      apiFetch(`/admin/appointments/${id}/${action}`, { method: 'POST', body: reason ? { reason } : {} }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff-appointments'] }),
  });
}

/** Admins (all facilities) search facilities to pick from; assigned staff use their own list. */
export function useFacilitySearchForStaff(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['staff-facility-search', q],
    queryFn: async () => (await apiGet<{ data: { id: string; name: string; city: string | null }[] }>(`/admin/facilities?per_page=30&q=${encodeURIComponent(q)}`)).data,
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30_000,
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
  created_at: string;
};

type QueueResponse = { data: QueueTicket[]; meta: { counts: Record<QueueStatus, number> } };

/** Today's walk-in queue at one facility; refreshes every 5 seconds so staff stay in step. */
export function useQueue(facilityId: string | null) {
  return useQuery({
    queryKey: ['queue', facilityId],
    queryFn: () => apiGet<QueueResponse>(`/admin/facilities/${facilityId}/queue`),
    enabled: facilityId !== null,
    refetchInterval: 5_000,
  });
}

function useQueueMutation<T>(facilityId: string, fn: (input: T) => Promise<{ data: QueueTicket }>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['queue', facilityId] }),
  });
}

export function useAddWalkIn(facilityId: string) {
  return useQueueMutation(facilityId, (input: { name?: string; mobile?: string }) => apiFetch<{ data: QueueTicket }>(`/admin/facilities/${facilityId}/queue`, { method: 'POST', body: input }));
}

export function useCallNext(facilityId: string) {
  return useQueueMutation(facilityId, (counter: string) => apiFetch<{ data: QueueTicket }>(`/admin/facilities/${facilityId}/queue/call-next`, { method: 'POST', body: counter ? { counter } : {} }));
}

export type CheckInResult = {
  ticket: QueueTicket;
  appointment: { id: string; reference_code: string; name: string | null; starts_at: string };
  already_checked_in: boolean;
};

/** Desk check-in: the reference code from the patient's QR code (or typed). */
export function useCheckIn(facilityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => apiFetch<{ data: CheckInResult }>(`/admin/facilities/${facilityId}/check-in`, { method: 'POST', body: { code } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['queue', facilityId] });
      void queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    },
  });
}

export type QueueAction = 'call' | 'serve' | 'done' | 'skip' | 'requeue';

export function useMoveTicket(facilityId: string) {
  return useQueueMutation(facilityId, ({ id, action, counter }: { id: string; action: QueueAction; counter?: string }) =>
    apiFetch<{ data: QueueTicket }>(`/admin/queue/${id}/${action}`, { method: 'POST', body: counter ? { counter } : {} }));
}

const COUNTER_KEY = 'communitycare.queue_counter';

/** The window / counter name this phone calls numbers to, remembered on the phone. */
export function useCounterName() {
  const [counter, setState] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync(COUNTER_KEY).then((value) => value && setState(value)).catch(() => undefined);
  }, []);

  const setCounter = useCallback((value: string) => {
    setState(value);
    void SecureStore.setItemAsync(COUNTER_KEY, value).catch(() => undefined);
  }, []);

  return [counter, setCounter] as const;
}

/** Every appointment in one month (Philippine dates) for the calendar, following the chosen facilities. */
export function useStaffCalendar(month: string, scope: StaffScope | null) {
  const params = new URLSearchParams({ month });
  if (scope?.facilityIds.length) {
    params.set('facility_id', scope.facilityIds.join(','));
  }

  return useQuery({
    queryKey: ['staff-appointments', 'calendar', month, scope?.facilityIds.join(',') ?? ''],
    queryFn: () => apiGet<{ data: StaffAppointment[]; meta: { total: number; truncated: boolean } }>(`/admin/appointments/calendar?${params}`),
    enabled: scope !== null,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
