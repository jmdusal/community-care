import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { KeyValueList } from '../../../components/ui/KeyValueList';
import { Pill } from '../../../components/ui/Pill';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ApiError } from '../../../lib/api';
import { formatSlot, SOURCE_LABELS, STATUS_TONES } from '../../../lib/booking';
import { formatDay } from '../../../lib/format';
import { usePatient, useSetPatientStatus } from '../api';

/** One patient: contact details, account status and their appointments you are allowed to see. */
export function PatientPanel({ id, canManage, onClose }: { id: string | null; canManage: boolean; onClose: () => void }) {
  const patient = usePatient(id);
  const setStatus = useSetPatientStatus(id ?? '');
  const data = patient.data;

  return (
    <SlideOver
      open={id !== null}
      onClose={onClose}
      title={data?.name ?? 'Patient'}
      description={data?.email}
      footer={canManage && data ? (
        data.status === 'suspended' ? (
          <Button variant="primary" disabled={setStatus.isPending} onClick={() => setStatus.mutate('active')}>Reactivate account</Button>
        ) : (
          <Button variant="danger" disabled={setStatus.isPending} onClick={() => setStatus.mutate('suspended')}>Suspend account</Button>
        )
      ) : undefined}
    >
      {patient.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : !data ? (
        <Alert tone="warning">This patient could not be loaded.</Alert>
      ) : (
        <div className="space-y-6">
          {setStatus.error instanceof ApiError && <Alert tone="danger">{setStatus.error.body.message}</Alert>}
          {data.status === 'suspended' && <Alert tone="warning">This account is suspended. The patient cannot sign in or request appointments.</Alert>}

          <KeyValueList
            rows={[
              ['Mobile', data.mobile ? <a href={`tel:${data.mobile}`} className="text-brand-700 hover:underline dark:text-brand-100">{data.mobile}</a> : '—'],
              ['Email', <a href={`mailto:${data.email}`} className="text-brand-700 hover:underline dark:text-brand-100">{data.email}</a>],
              ['Joined', formatDay(data.joined_at)],
              ['Last active', formatDay(data.last_active_at)],
              ['Two-factor sign-in', data.two_factor ? 'On' : 'Off'],
            ]}
          />

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Appointments ({data.appointments.length})</h3>
            {data.appointments.length === 0 ? (
              <p className="text-sm text-zinc-500">No appointments you can see.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-card border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {data.appointments.map((appointment) => (
                  <li key={appointment.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatSlot(appointment.starts_at)}</div>
                      <div className="truncate text-xs text-zinc-500">{appointment.facility.name} · {appointment.service?.name ?? 'General consultation'}</div>
                      <div className="font-mono text-[11px] text-zinc-500">{appointment.reference_code}{appointment.source ? ` · ${SOURCE_LABELS[appointment.source]}` : ''}</div>
                    </div>
                    <Pill tone={STATUS_TONES[appointment.status.value]} dot>{appointment.status.label}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </SlideOver>
  );
}
