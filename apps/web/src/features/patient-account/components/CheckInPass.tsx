import { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import type { Appointment } from '../../../lib/booking';

/**
 * Desk check-in for a confirmed appointment: the QR code staff scan (it holds only the
 * reference code), then the queue number once the patient has arrived.
 */
export function CheckInPass({ appointment }: { appointment: Appointment }) {
  const today = new Date(appointment.starts_at).toDateString() === new Date().toDateString();
  const [open, setOpen] = useState(today);

  if (appointment.queue_number) {
    return (
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <Icon name="check" className="h-5 w-5 shrink-0" />
        <span>You are checked in. Your queue number is <span className="font-mono text-base font-bold">{appointment.queue_number}</span>. Watch the screen or listen for your number.</span>
      </div>
    );
  }

  if (!appointment.check_in_qr) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/60"
      >
        <Icon name="qr" className="h-4 w-4 text-brand-700 dark:text-brand-100" />
        <span className="flex-1">Check-in QR code</span>
        <span className="text-xs font-normal text-zinc-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="flex flex-col items-center gap-2 border-t border-zinc-100 px-3 py-4 text-center dark:border-zinc-800">
          {/* Always on white, so phone cameras read it in dark mode too. */}
          <img src={appointment.check_in_qr} alt={`Check-in QR code for ${appointment.reference_code}`} className="h-48 w-48 rounded-md bg-white p-1" />
          <p className="max-w-xs text-xs text-zinc-600 dark:text-zinc-400">Show this at the desk on the day. Staff scan it and give you a queue number. You can also tell them the reference code.</p>
        </div>
      )}
    </div>
  );
}
