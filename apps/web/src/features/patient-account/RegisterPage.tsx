import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, inputClass } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { useMe } from '../auth/useAuth';
import { type RegisterInput, useRegister } from './api';
import { AccountCard } from './components/AccountCard';

const EMPTY: RegisterInput = { name: '', email: '', mobile: '', password: '', password_confirmation: '', privacy_consent: false };

/** Patient sign-up: name, email, mobile (so the clinic can reach you), password and consent. */
export function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/account/appointments';
  const me = useMe();
  const register = useRegister();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>(EMPTY);
  const error = register.error instanceof ApiError ? register.error : null;

  if (me.data && !register.isPending && !register.isSuccess) {
    return <Navigate to={next} replace />;
  }

  const set = (key: keyof RegisterInput) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    register.mutate(form, { onSuccess: () => navigate(next, { replace: true }) });
  };

  return (
    <AccountCard
      title="Create an account"
      subtitle="Request appointments at participating facilities and track them in one place."
      footer={<>Already have an account? <Link to={`/account/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 hover:underline dark:text-brand-100">Sign in</Link></>}
    >
      {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" error={error?.field('name')}><input required autoComplete="name" className={`${inputClass} h-11`} value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" error={error?.field('email')}><input type="email" required autoComplete="email" className={`${inputClass} h-11`} value={form.email} onChange={set('email')} /></Field>
        <Field label="Mobile number" hint="The clinic uses this to reach you about your appointment." error={error?.field('mobile')}>
          <input type="tel" required autoComplete="tel" inputMode="tel" placeholder="0917 123 4567" className={`${inputClass} h-11`} value={form.mobile} onChange={set('mobile')} />
        </Field>
        <Field label="Password" hint="At least 10 characters." error={error?.field('password')}><input type="password" required autoComplete="new-password" className={`${inputClass} h-11`} value={form.password} onChange={set('password')} /></Field>
        <Field label="Confirm password"><input type="password" required autoComplete="new-password" className={`${inputClass} h-11`} value={form.password_confirmation} onChange={set('password_confirmation')} /></Field>

        <label className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.privacy_consent} onChange={(event) => setForm((current) => ({ ...current, privacy_consent: event.target.checked }))} />
          <span>
            I agree that CommunityCare shares my name, email and mobile number with the facility I request an appointment at, only to arrange that appointment. CommunityCare does not ask for or store medical information.
            {error?.field('privacy_consent') && <span className="mt-1 block text-[11px] text-rose-700">{error.field('privacy_consent')}</span>}
          </span>
        </label>

        <Button type="submit" variant="brand" className="h-11 w-full" disabled={register.isPending}>{register.isPending ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AccountCard>
  );
}
