import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Pill } from '../../../components/ui/Pill';
import { CheckInPass } from './CheckInPass';
import { type Appointment, formatSlot, STATUS_TONES } from '../../../lib/booking';

/** One of the patient's appointments, with its reference code and a cancel button while allowed. */
export function MyAppointmentCard({ appointment, onCancel, cancelling }: { appointment: Appointment; onCancel: () => void; cancelling: boolean }) {
  const upcoming = new Date(appointment.starts_at).getTime() > Date.now();
  const [confirming, setConfirming] = useState(false);

  return (
    <article className="rounded-card border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-900 dark:text-white">{formatSlot(appointment.starts_at)}</p>
          <Link to={`/facilities/${appointment.facility.id}`} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-100">{appointment.facility.name}</Link>
          {appointment.facility.address && <p className="text-xs text-zinc-500">{appointment.facility.address}</p>}
          {appointment.service && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Service: {appointment.service.name}</p>}
        </div>
        <Pill tone={STATUS_TONES[appointment.status.value]} dot>{appointment.status.label}</Pill>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
        <span>Reference <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{appointment.reference_code}</span></span>
        {appointment.can_cancel && upcoming && (confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Cancel this appointment?</span>
            <Button variant="danger" className="h-8 text-xs" onClick={onCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Yes, cancel'}</Button>
            <Button className="h-8 text-xs" onClick={() => setConfirming(false)} disabled={cancelling}>Keep it</Button>
          </span>
        ) : (
          <Button className="h-8 text-xs" onClick={() => setConfirming(true)}>Cancel appointment</Button>
        ))}
      </div>
      <CheckInPass appointment={appointment} />
      {appointment.status_reason && appointment.status.value !== 'cancelled' && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Note from the clinic: {appointment.status_reason}</p>}
    </article>
  );
}
