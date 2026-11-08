import * as Crypto from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiGet, type Paginated } from './api';

export type Slot = { id: string; starts_at: string; ends_at: string; service: { slug: string; name: string } | null; seats_left: number };

export type AppointmentStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show';

export type Appointment = {
  id: string;
  reference_code: string;
  status: { value: AppointmentStatus; label: string };
  starts_at: string;
  ends_at: string;
  facility: { id: string; name: string; address: string | null };
  service: { slug: string; name: string } | null;
  status_reason: string | null;
  can_cancel: boolean;
  /** The queue number given when the patient checked in at the desk (e.g. "007"). */
  queue_number?: string | null;
  /** A PNG data URI to show at the desk, while confirmed and not yet arrived. */
  check_in_qr?: string | null;
};

export function useSlots(facilityId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['slots', facilityId],
    queryFn: () => apiGet<{ data: Slot[]; meta: { booking_enabled: boolean } }>(`/facilities/${facilityId}/availability?days=14`),
    enabled,
    staleTime: 30_000,
  });
}

/** A new key per chosen time: a retry after a dropped connection never books twice. */
export function newIdempotencyKey(): string {
  return Crypto.randomUUID();
}

export function useRequestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slotId, key }: { slotId: string; key: string }) =>
      (await apiFetch<{ data: Appointment }>('/appointments', { method: 'POST', body: { slot_id: slotId }, headers: { 'Idempotency-Key': key } })).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['slots'] });
      void queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
  });
}

export function useMyAppointments(enabled: boolean) {
  return useQuery({ queryKey: ['my-appointments'], queryFn: () => apiGet<Paginated<Appointment>>('/me/appointments?per_page=50'), enabled });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/appointments/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-appointments'] }),
  });
}

const TZ = 'Asia/Manila';

export function formatSlot(iso: string): string {
  const date = new Date(iso);

  return `${date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ })} · ${date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: TZ })}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

/** Groups slots by Philippine calendar day. */
export function groupByDay(slots: Slot[]): { day: string; label: string; slots: Slot[] }[] {
  const groups = new Map<string, { day: string; label: string; slots: Slot[] }>();
  for (const slot of slots) {
    const date = new Date(slot.starts_at);
    const day = date.toLocaleDateString('en-CA', { timeZone: TZ });
    if (!groups.has(day)) {
      groups.set(day, { day, label: date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ }), slots: [] });
    }
    groups.get(day)!.slots.push(slot);
  }

  return [...groups.values()];
}

export const STATUS_COLORS: Record<AppointmentStatus, { fg: string; bg: string }> = {
  requested: { fg: '#b45309', bg: '#fffbeb' },
  confirmed: { fg: '#047857', bg: '#ecfdf5' },
  declined: { fg: '#be123c', bg: '#fff1f2' },
  cancelled: { fg: '#52525b', bg: '#f4f4f5' },
  completed: { fg: '#0369a1', bg: '#f0f9ff' },
  no_show: { fg: '#be123c', bg: '#fff1f2' },
};

export type GuestDetails = { name: string; email: string; mobile: string; privacy_consent: boolean };

/** Guest booking step 1: details + time; we email a 6-digit code. */
export function useGuestStart() {
  return useMutation({
    mutationFn: async (input: GuestDetails & { slot_id: string }) =>
      (await apiFetch<{ data: { verification_id: string; sent_to: string; expires_in_minutes: number } }>('/appointments/guest', { method: 'POST', body: input })).data,
  });
}

/** Guest booking step 2: the code sends the request to the clinic (safe to retry). */
export function useGuestVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { verification_id: string; code: string }) => (await apiFetch<{ data: Appointment }>('/appointments/guest/verify', { method: 'POST', body: input })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['slots'] }),
  });
}

/** Find (or cancel) an appointment by its reference code and the email it was made with. */
export function useAppointmentLookup() {
  return useMutation({
    mutationFn: async ({ reference_code, email, cancel = false }: { reference_code: string; email: string; cancel?: boolean }) =>
      (await apiFetch<{ data: Appointment }>(cancel ? '/appointments/lookup/cancel' : '/appointments/lookup', { method: 'POST', body: { reference_code, email } })).data,
  });
}
