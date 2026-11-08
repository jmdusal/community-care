import { Button } from '../../../components/ui/Button';
import { KeyValueList } from '../../../components/ui/KeyValueList';
import { Pill } from '../../../components/ui/Pill';
import { SlideOver } from '../../../components/ui/SlideOver';
import { type Appointment, formatSlot, formatTime, SOURCE_LABELS, STATUS_TONES } from '../../../lib/booking';
import { ACTION_FOR_STATUS, type StaffAction } from '../api';

/**
 * Side panel from the calendar: one appointment with its details and actions, or every
 * appointment on a day (click one to open it).
 */
export function AppointmentPanel({ appointment, day, busy, onAction, onPick, onClose }: {
  appointment: Appointment | null;
  day: { date: string; items: Appointment[] } | null;
  busy: boolean;
  onAction: (appointment: Appointment, action: StaffAction, needsReason: boolean) => void;
  /** Open one appointment, or null to go back to the day's list. */
  onPick: (appointment: Appointment | null) => void;
  onClose: () => void;
}) {
  const open = appointment !== null || day !== null;
  const dayTitle = day ? new Date(`${day.date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={appointment ? formatSlot(appointment.starts_at) : dayTitle}
      description={appointment ? `Reference ${appointment.reference_code}` : day ? `${day.items.length} ${day.items.length === 1 ? 'appointment' : 'appointments'}` : undefined}
      footer={appointment && (appointment.next_actions ?? []).length > 0 ? (
        <div className="flex w-full flex-wrap justify-end gap-2">
          {day && <Button variant="ghost" className="mr-auto" onClick={() => onPick(null)}>Back to the day</Button>}
          {(appointment.next_actions ?? []).map((status) => {
            const action = ACTION_FOR_STATUS[status];

            return action ? <Button key={status} variant={action.variant} disabled={busy} onClick={() => onAction(appointment, action.action, action.needsReason === true)}>{action.label}</Button> : null;
          })}
        </div>
      ) : appointment && day ? <Button variant="ghost" onClick={() => onPick(null)}>Back to the day</Button> : undefined}
    >
      {appointment ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={STATUS_TONES[appointment.status.value]} dot>{appointment.status.label}</Pill>
            {appointment.source && <Pill>{SOURCE_LABELS[appointment.source]}</Pill>}
          </div>
          <KeyValueList
            rows={[
              ['Patient', appointment.patient?.name ?? '—'],
              ['Mobile', appointment.patient?.mobile ? <a href={`tel:${appointment.patient.mobile}`} className="text-brand-700 hover:underline dark:text-brand-100">{appointment.patient.mobile}</a> : '—'],
              ['Email', appointment.patient?.email ?? '—'],
              ['Facility', appointment.facility.name],
              ['Service', appointment.service?.name ?? 'General consultation'],
              ['Time', `${formatTime(appointment.starts_at)} – ${formatTime(appointment.ends_at)}`],
              ...(appointment.booked_by ? [['Booked by', appointment.booked_by] as [string, string]] : []),
            ]}
          />
          {appointment.status_reason && <p className="rounded-control bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Note: {appointment.status_reason}</p>}
          {(appointment.next_actions ?? []).length === 0 && <p className="text-sm text-zinc-500">Nothing more to do for this appointment.</p>}
        </div>
      ) : day ? (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-card border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {day.items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onPick(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                <span className="w-16 shrink-0 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">{formatTime(item.starts_at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-800 dark:text-zinc-200">{item.patient?.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{item.facility.name} · {item.service?.name ?? 'General'}</span>
                </span>
                <Pill tone={STATUS_TONES[item.status.value]} dot>{item.status.label}</Pill>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </SlideOver>
  );
}
