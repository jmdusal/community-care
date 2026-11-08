import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, inputClass } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { TwoFactorStep } from '../auth/components/TwoFactorStep';
import { useLogin, useMe } from '../auth/useAuth';
import { isStaff } from './api';
import { AccountCard } from './components/AccountCard';

/** Public sign-in for patients (staff are sent to the admin console). */
export function SignInPage() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/account/appointments';
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const error = login.error instanceof ApiError ? login.error : null;

  if (me.data && !login.isPending) {
    return <Navigate to={isStaff(me.data) && next === '/account/appointments' ? '/admin' : next} replace />;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password, remember }, { onSuccess: ({ user }) => user && navigate(isStaff(user) && next === '/account/appointments' ? '/admin' : next, { replace: true }) });
  };

  if (login.data?.two_factor_required) {
    return (
      <AccountCard title="Two-factor sign-in" subtitle={email}>
        <TwoFactorStep method={login.data.method} sentTo={login.data.sent_to} onSignedIn={(user) => navigate(isStaff(user) && next === '/account/appointments' ? '/admin' : next, { replace: true })} onCancel={() => { login.reset(); setPassword(''); }} />
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title="Sign in"
      subtitle="To request and track appointments."
      footer={<>New here? <Link to={`/account/register?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 hover:underline dark:text-brand-100">Create an account</Link></>}
    >
      {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" error={error?.field('email')}>
          <input type="email" autoComplete="username" required className={`${inputClass} h-11`} value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" error={error?.field('password')}>
          <input type="password" autoComplete="current-password" required className={`${inputClass} h-11`} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Keep me signed in
        </label>
        <Button type="submit" variant="brand" className="h-11 w-full" disabled={login.isPending}>{login.isPending ? 'Signing in…' : 'Sign in'}</Button>
        <Link to="/forgot-password" className="block text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Forgot your password?</Link>
      </form>
    </AccountCard>
  );
}
