import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { buttonClass } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiError } from '../../lib/api';
import { useCancelMyAppointment, useMyAppointments } from '../../lib/booking';
import { useMe } from '../auth/useAuth';
import { MyAppointmentCard } from './components/MyAppointmentCard';

/** The signed-in person's appointments: upcoming first, then past. */
export function MyAppointmentsPage() {
  const me = useMe();
  const appointments = useMyAppointments(me.data !== undefined);
  const cancel = useCancelMyAppointment();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (me.error instanceof ApiError && me.error.status === 401) {
    return <Navigate to="/account/sign-in?next=/account/appointments" replace />;
  }

  const list = appointments.data?.data ?? [];
  const now = Date.now();
  const upcoming = list.filter((item) => new Date(item.starts_at).getTime() > now && ['requested', 'confirmed'].includes(item.status.value));
  const past = list.filter((item) => !upcoming.includes(item));

  const onCancel = (id: string) => {
    setCancellingId(id);
    cancel.mutate(id, { onSettled: () => setCancellingId(null) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">My appointments</h1>
        <p className="mt-1 text-sm text-zinc-500">Requests stay "Waiting for the clinic" until the facility confirms. We email you when it does.</p>
      </div>

      {cancel.error instanceof ApiError && <Alert tone="danger">{cancel.error.body.message}</Alert>}

      {appointments.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : list.length === 0 ? (
        <EmptyState icon="calendar" title="No appointments yet" action={<Link to="/" className={buttonClass('primary')}>Find a facility</Link>}>
          Facilities taking part in online booking show "Request an appointment" on their page.
        </EmptyState>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Upcoming</h2>
            {upcoming.length === 0 ? <p className="text-sm text-zinc-500">Nothing upcoming.</p> : upcoming.map((item) => (
              <MyAppointmentCard key={item.id} appointment={item} onCancel={() => onCancel(item.id)} cancelling={cancellingId === item.id} />
            ))}
          </section>
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Past and cancelled</h2>
              {past.map((item) => <MyAppointmentCard key={item.id} appointment={item} onCancel={() => undefined} cancelling={false} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
