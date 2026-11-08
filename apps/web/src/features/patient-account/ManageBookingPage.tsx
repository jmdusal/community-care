import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button, buttonClass } from '../../components/ui/Button';
import { Field, inputClass } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { useAppointmentLookup } from '../../lib/booking';
import { AccountCard } from './components/AccountCard';
import { MyAppointmentCard } from './components/MyAppointmentCard';

/**
 * Check or cancel an appointment without signing in: the reference code (from the email or
 * the clinic) plus the email it was made with. Works for guests and for staff bookings.
 */
export function ManageBookingPage() {
  const [params] = useSearchParams();
  const [reference, setReference] = useState(params.get('ref') ?? '');
  const [email, setEmail] = useState('');
  const lookup = useAppointmentLookup();
  const cancel = useAppointmentLookup();
  const appointment = cancel.data ?? lookup.data;

  const find = (event: FormEvent) => {
    event.preventDefault();
    cancel.reset();
    lookup.mutate({ reference_code: reference.trim(), email: email.trim() });
  };

  if (appointment) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Your appointment</h1>
        {cancel.data && <Alert>Cancelled. The time is open for someone else, and the clinic has been told.</Alert>}
        {cancel.error instanceof ApiError && <Alert tone="danger">{cancel.error.body.message}</Alert>}
        <MyAppointmentCard
          appointment={appointment}
          cancelling={cancel.isPending}
          onCancel={() => cancel.mutate({ reference_code: appointment.reference_code, email: email.trim() })}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { lookup.reset(); cancel.reset(); }}>Look up another</Button>
          <Link to="/account/register" className={buttonClass('ghost')}>Create an account to see all your appointments</Link>
        </div>
      </div>
    );
  }

  return (
    <AccountCard
      title="Check or cancel a booking"
      subtitle="Use the reference code from your email or the clinic, and the email you booked with."
      footer={<>Have an account? <Link to="/account/sign-in?next=/account/appointments" className="font-medium text-brand-700 hover:underline dark:text-brand-100">Sign in</Link> to see all your appointments.</>}
    >
      <form onSubmit={find} className="space-y-4">
        {lookup.error instanceof ApiError && <Alert tone="danger">{lookup.error.status === 404 ? 'No appointment matches that reference code and email. Check both and try again.' : lookup.error.body.message}</Alert>}
        <Field label="Reference code">
          <input className={`${inputClass} font-mono uppercase`} placeholder="CC-7KQ2-9MXD" value={reference} onChange={(event) => setReference(event.target.value)} required maxLength={20} autoComplete="off" />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Button type="submit" variant="brand" className="w-full" disabled={lookup.isPending}>{lookup.isPending ? 'Looking…' : 'Find my appointment'}</Button>
      </form>
    </AccountCard>
  );
}
