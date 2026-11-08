import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiList, apiRaw, apiRequest } from './api';

/** Shared by the public facility page (request a time) and the patient's "My appointments". */
export type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  service: { slug: string; name: string } | null;
  seats_left: number;
  capacity?: number;
  booked?: number;
};

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
  requested_at: string;
  /** online (patient account), guest (no account, email-verified) or staff (booked by the clinic). */
  source?: 'online' | 'guest' | 'staff';
  /** Staff views only. account_id is set when the person has a patient account. */
  patient?: { name: string; mobile: string | null; email: string | null; account_id: string | null };
  /** Staff views only: who booked it, for appointments made by the clinic. */
  booked_by?: string;
  next_actions?: AppointmentStatus[];
  /** Set when the patient checked in at the desk (QR or reference code). */
  arrived_at?: string | null;
  /** The walk-in queue number given at check-in (e.g. "007"). */
  queue_number?: string | null;
  /** Patient views only: a PNG data URI to show at the desk, while confirmed and not yet arrived. */
  check_in_qr?: string | null;
  history?: Array<{ from: string | null; to: string; note: string | null; by: string | null; at: string }>;
};

export function useFacilitySlots(facilityId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['facility-slots', facilityId],
    queryFn: () => apiRaw<{ data: Slot[]; meta: { booking_enabled: boolean } }>(`/facilities/${facilityId}/availability?days=14`),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Requests a slot. The idempotency key is created once per chosen slot, so a retry after a
 * dropped connection returns the same appointment instead of booking twice.
 */
export function useRequestAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, idempotencyKey }: { slotId: string; idempotencyKey: string }) =>
      apiRequest<Appointment>('/appointments', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ slot_id: slotId }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['facility-slots'] });
      void queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
  });
}

export function useMyAppointments(enabled = true) {
  return useQuery({ queryKey: ['my-appointments'], queryFn: () => apiList<Appointment>('/me/appointments?per_page=50'), enabled, placeholderData: keepPreviousData });
}

export function useCancelMyAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: 'Appointment cancelled', error: 'Could not cancel' },
    mutationFn: (id: string) => apiRequest<Appointment>(`/appointments/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-appointments'] }),
  });
}

export const SOURCE_LABELS: Record<NonNullable<Appointment['source']>, string> = { online: 'Online', guest: 'Guest', staff: 'Booked by clinic' };

export const STATUS_TONES: Record<AppointmentStatus, 'amber' | 'emerald' | 'rose' | 'zinc' | 'sky'> = {
  requested: 'amber',
  confirmed: 'emerald',
  declined: 'rose',
  cancelled: 'zinc',
  completed: 'sky',
  no_show: 'rose',
};

/** "Mon, Nov 10 · 8:00 AM" in Philippine time. */
export function formatSlot(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
  const time = date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });

  return `${day} · ${time}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
}

/** Groups items by their Philippine calendar day, in order. */
export function groupByDay<T extends { starts_at: string }>(items: T[]): Array<{ day: string; label: string; items: T[] }> {
  const groups = new Map<string, { day: string; label: string; items: T[] }>();
  for (const item of items) {
    const date = new Date(item.starts_at);
    const day = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const label = date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
    if (!groups.has(day)) {
      groups.set(day, { day, label, items: [] });
    }
    groups.get(day)!.items.push(item);
  }

  return [...groups.values()];
}

/**
 * A random key for the Idempotency-Key header. crypto.randomUUID only exists on HTTPS
 * and localhost, so this uses getRandomValues, which works on plain-HTTP hosts too.
 */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type GuestDetails = { name: string; email: string; mobile: string; privacy_consent: boolean };

/** Guest booking step 1: details + slot; we email a 6-digit code. */
export function useGuestStart() {
  return useMutation({
    meta: { success: (d) => `Code sent to ${(d as { sent_to: string }).sent_to}`, error: 'Could not send the code' },
    mutationFn: (input: GuestDetails & { slot_id: string }) =>
      apiRequest<{ verification_id: string; sent_to: string; expires_in_minutes: number }>('/appointments/guest', { method: 'POST', body: JSON.stringify(input) }),
  });
}

/** Guest booking step 2: the code sends the request to the clinic (retry-safe). */
export function useGuestVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { verification_id: string; code: string }) => apiRequest<Appointment>('/appointments/guest/verify', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['facility-slots'] }),
  });
}

/** Find (or cancel) an appointment by its reference code and the email it was made with. */
export function useAppointmentLookup() {
  return useMutation({
    mutationFn: ({ reference_code, email, cancel = false }: { reference_code: string; email: string; cancel?: boolean }) =>
      apiRequest<Appointment>(cancel ? '/appointments/lookup/cancel' : '/appointments/lookup', { method: 'POST', body: JSON.stringify({ reference_code, email }) }),
  });
}
