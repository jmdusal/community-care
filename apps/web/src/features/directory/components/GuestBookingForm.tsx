import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { Button, buttonClass } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { ApiError } from '../../../lib/api';
import { type Appointment, formatSlot, type Slot, useGuestStart, useGuestVerify } from '../../../lib/booking';

/**
 * Request a time without an account: name, email and mobile, then the 6-digit code we email.
 * Proving the email stops strangers booking in someone else's name. The reference code plus
 * the email is how a guest checks or cancels later.
 */
export function GuestBookingForm({ slot, onBack }: { slot: Slot; onBack: () => void }) {
  const start = useGuestStart();
  const verify = useGuestVerify();
  const [details, setDetails] = useState({ name: '', email: '', mobile: '', privacy_consent: false });
  const [code, setCode] = useState('');
  const [done, setDone] = useState<Appointment | null>(null);
  const sent = start.data;
  const fieldError = (field: string) => (start.error instanceof ApiError ? start.error.field(field) : undefined);

  const send = (event: FormEvent) => {
    event.preventDefault();
    start.mutate({ ...details, slot_id: slot.id });
  };

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    if (sent) {
      verify.mutate({ verification_id: sent.verification_id, code: code.trim() }, { onSuccess: setDone });
    }
  };

  if (done) {
    return (
      <div className="space-y-3">
        <Alert>
          Request sent for <strong>{formatSlot(done.starts_at)}</strong>. Your reference is <span className="font-mono font-semibold">{done.reference_code}</span>.
        </Alert>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          It is not confirmed yet. We emailed you the details, and we will email again when the clinic confirms or declines. Keep the reference code: with your email, it lets you check or cancel.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/appointments/manage?ref=${encodeURIComponent(done.reference_code)}`} className={buttonClass('primary')}>Check or cancel</Link>
          <Link to="/account/register" className={buttonClass('secondary')}>Create an account</Link>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <form onSubmit={confirm} className="space-y-3">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">We sent a 6-digit code to <strong>{sent.sent_to}</strong>. Enter it to send your request for {formatSlot(slot.starts_at)}.</p>
        <Field label="Code" error={verify.error instanceof ApiError ? (verify.error.field('code') ?? verify.error.body.message) : undefined}>
          <input className={`${inputClass} font-mono tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required autoFocus />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="brand" disabled={verify.isPending || code.length !== 6}>{verify.isPending ? 'Sending…' : 'Send request'}</Button>
          <Button variant="ghost" onClick={() => { start.reset(); verify.reset(); setCode(''); }}>Use a different email</Button>
        </div>
        <p className="text-[11px] text-zinc-500">The code works for {sent.expires_in_minutes} minutes. Check your spam folder if it does not arrive.</p>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">Requesting <strong>{formatSlot(slot.starts_at)}</strong>{slot.service ? ` · ${slot.service.name}` : ''} without an account.</p>
      {start.error instanceof ApiError && !fieldError('name') && !fieldError('email') && !fieldError('mobile') && !fieldError('privacy_consent') && <Alert tone="danger">{start.error.body.message}</Alert>}
      <Field label="Full name" error={fieldError('name')}>
        <input className={inputClass} autoComplete="name" value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} required minLength={2} maxLength={120} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" hint="We send a code here." error={fieldError('email')}>
          <input className={inputClass} type="email" autoComplete="email" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} required />
        </Field>
        <Field label="Mobile" hint="So the clinic can reach you." error={fieldError('mobile')}>
          <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={details.mobile} onChange={(event) => setDetails({ ...details, mobile: event.target.value })} required />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <input type="checkbox" className="mt-0.5 accent-brand-600" checked={details.privacy_consent} onChange={(event) => setDetails({ ...details, privacy_consent: event.target.checked })} required />
        <span>I agree that CommunityCare shares my name, mobile and email with this facility to handle my request. No medical information is collected.</span>
      </label>
      {fieldError('privacy_consent') && <p className="text-xs text-rose-700">{fieldError('privacy_consent')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="brand" disabled={start.isPending}>{start.isPending ? 'Sending code…' : 'Email me a code'}</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </form>
  );
}
