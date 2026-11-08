import { ActionsHeader, RowActions } from '../../../components/ui/RowActions';
import { Pill } from '../../../components/ui/Pill';
import { type Appointment, formatSlot, SOURCE_LABELS, STATUS_TONES } from '../../../lib/booking';
import type { IconName } from '../../../components/ui/Icon';
import { ACTION_FOR_STATUS, type StaffAction } from '../api';

const ACTION_ICONS: Record<StaffAction, IconName> = { confirm: 'check', decline: 'x', cancel: 'x', complete: 'check', 'no-show': 'alert' };

/** Staff list: when, who (name and mobile so the clinic can call), where, status and the allowed actions. */
export function AppointmentTable({ appointments, onAction, busyId }: {
  appointments: Appointment[];
  onAction: (appointment: Appointment, action: StaffAction, needsReason: boolean) => void;
  busyId: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="px-4 py-2.5 font-medium">When</th>
            <th className="px-3 py-2.5 font-medium">Patient</th>
            <th className="px-3 py-2.5 font-medium">Facility · service</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <ActionsHeader />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{formatSlot(appointment.starts_at)}</div>
                <div className="font-mono text-[11px] text-zinc-500">{appointment.reference_code}</div>
              </td>
              <td className="min-w-[180px] px-3 py-3">
                <div className="text-zinc-900 dark:text-zinc-100">{appointment.patient?.name}</div>
                {appointment.patient?.mobile && <a href={`tel:${appointment.patient.mobile}`} className="text-xs text-brand-700 hover:underline dark:text-brand-100">{appointment.patient.mobile}</a>}
                {appointment.source && appointment.source !== 'online' && (
                  <div className="mt-1" title={appointment.booked_by ? `Booked by ${appointment.booked_by}` : undefined}><Pill tone={appointment.source === 'guest' ? 'violet' : 'teal'}>{SOURCE_LABELS[appointment.source]}</Pill></div>
                )}
              </td>
              <td className="min-w-[200px] px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                {appointment.facility.name}
                <span className="block text-zinc-500">{appointment.service?.name ?? 'General consultation'}</span>
              </td>
              <td className="px-3 py-3">
                <Pill tone={STATUS_TONES[appointment.status.value]} dot>{appointment.status.label}</Pill>
                {appointment.status_reason && <div className="mt-1 max-w-[220px] text-[11px] text-zinc-500">{appointment.status_reason}</div>}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions
                  label={`Actions for ${appointment.reference_code}`}
                  actions={[
                    ...(appointment.next_actions ?? []).flatMap((status) => {
                      const action = ACTION_FOR_STATUS[status];

                      return action ? [{
                        label: action.label,
                        icon: ACTION_ICONS[action.action],
                        tone: action.variant === 'danger' ? ('danger' as const) : ('default' as const),
                        disabled: busyId === appointment.id,
                        onClick: () => onAction(appointment, action.action, action.needsReason === true),
                      }] : [];
                    }),
                    { label: 'Call patient', icon: 'phone', onClick: () => { window.location.href = `tel:${appointment.patient?.mobile}`; }, hidden: !appointment.patient?.mobile },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
