import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { Button, buttonClass } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ApiError } from '../../../lib/api';
import { formatSlot, formatTime, groupByDay, newIdempotencyKey, type Slot, useFacilitySlots, useRequestAppointment } from '../../../lib/booking';
import { cx } from '../../../lib/cx';
import { useMe } from '../../auth/useAuth';
import { GuestBookingForm } from './GuestBookingForm';

/**
 * "Request an appointment" on a participating facility: pick a time, then confirm.
 * A request is not a booking until the clinic confirms; the patient is emailed either way.
 */
export function BookingPanel({ facilityId }: { facilityId: string }) {
  const location = useLocation();
  const me = useMe();
  const slots = useFacilitySlots(facilityId, true);
  const request = useRequestAppointment();
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [asGuest, setAsGuest] = useState(false);
  // One key per chosen slot: retrying after a dropped connection cannot book twice.
  const idempotencyKey = useMemo(() => (chosen ? newIdempotencyKey() : ''), [chosen]);

  const days = groupByDay(slots.data?.data ?? []);
  const day = days[Math.min(dayIndex, Math.max(days.length - 1, 0))];
  const signedIn = me.data !== undefined;

  if (request.data) {
    return (
      <div className="space-y-3">
        <Alert>
          Request sent for <strong>{formatSlot(request.data.starts_at)}</strong>. Reference <span className="font-mono font-semibold">{request.data.reference_code}</span>.
        </Alert>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">This is not confirmed yet. The clinic will confirm or decline, and we will email you.</p>
        <Link to="/account/appointments" className={buttonClass('primary')}>View my appointments</Link>
      </div>
    );
  }

  if (chosen && asGuest && !signedIn) {
    return <GuestBookingForm slot={chosen} onBack={() => setAsGuest(false)} />;
  }

  if (slots.isPending) {
    return <p className="text-sm text-zinc-500">Loading available times…</p>;
  }
  if (days.length === 0) {
    return <p className="text-sm text-zinc-500">No open times in the next two weeks. Please call the facility.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day">
        {days.map((item, index) => (
          <button
            key={item.day}
            type="button"
            role="tab"
            aria-selected={index === dayIndex}
            onClick={() => { setDayIndex(index); setChosen(null); }}
            className={cx('shrink-0 rounded-control border px-3 py-2 text-left text-xs', index === dayIndex ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-700/30 dark:text-brand-100' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300')}
          >
            {item.label.split(',')[0]}
            <span className="block font-normal text-zinc-500">{item.label.split(', ').slice(1).join(', ')}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {day.items.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => setChosen(slot)}
            aria-pressed={chosen?.id === slot.id}
            className={cx('rounded-control border px-2 py-2 text-sm', chosen?.id === slot.id ? 'border-brand-700 bg-brand-700 font-semibold text-white' : 'border-zinc-200 text-zinc-800 hover:border-brand-400 dark:border-zinc-700 dark:text-zinc-200')}
          >
            {formatTime(slot.starts_at)}
            <span className={cx('block text-[10px]', chosen?.id === slot.id ? 'text-white/80' : 'text-zinc-500')}>{slot.service?.name ?? 'General'} · {slot.seats_left} left</span>
          </button>
        ))}
      </div>

      {request.error && <Alert tone="danger">{request.error instanceof ApiError ? request.error.body.message : 'Could not send the request. Try again.'}</Alert>}

      {chosen && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-100 bg-brand-50 p-3 dark:border-brand-700 dark:bg-brand-700/20">
          <span className="text-sm text-zinc-800 dark:text-zinc-100"><Icon name="calendar" className="mr-1 inline h-4 w-4" /> {formatSlot(chosen.starts_at)}{chosen.service ? ` · ${chosen.service.name}` : ''}</span>
          {signedIn ? (
            <Button variant="brand" onClick={() => request.mutate({ slotId: chosen.id, idempotencyKey })} disabled={request.isPending}>
              {request.isPending ? 'Sending…' : 'Request this time'}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="brand" onClick={() => setAsGuest(true)}>Continue as guest</Button>
              <Link to={`/account/sign-in?next=${encodeURIComponent(location.pathname)}`} className={buttonClass('secondary')}>Sign in</Link>
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-zinc-500">
        Requests are free. Don't use this for emergencies: call 911. Booked as a guest? <Link to="/appointments/manage" className="underline hover:text-zinc-900 dark:hover:text-white">Check or cancel it</Link>.
      </p>
    </div>
  );
}
