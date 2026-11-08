import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { ApiError } from '../../lib/api';
import { AuthCard } from './AuthCard';
import { IconInput } from './components/IconInput';
import { TwoFactorStep } from './components/TwoFactorStep';
import { useLogin, useMe } from './useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = login.error instanceof ApiError ? login.error : null;

  const next = params.get('next') ?? '/admin';

  // Already signed in (session or "keep me signed in" cookie): skip the form.
  if (me.data && !login.isPending) {
    return <Navigate to={next} replace />;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password, remember }, { onSuccess: (result) => result.user && navigate(next, { replace: true }) });
  };

  if (login.data?.two_factor_required) {
    return (
      <AuthCard title="Check your code" subtitle={email}>
        <TwoFactorStep method={login.data.method} sentTo={login.data.sent_to} onSignedIn={() => navigate(next, { replace: true })} onCancel={() => { login.reset(); setPassword(''); }} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in" subtitle="Admin console" footer="New team members join by invitation from an administrator.">
      {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
      {login.error && !error && <Alert tone="danger">Could not reach the server. Try again in a moment.</Alert>}

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" error={error?.field('email')}>
          <IconInput icon="mail" type="email" autoComplete="username" required autoFocus placeholder="you@agency.gov.ph" invalid={!!error?.field('email')} value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" error={error?.field('password')}>
          <IconInput icon="lock" type="password" autoComplete="current-password" required placeholder="Your password" invalid={!!error?.field('password')} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400" title="Untick on shared or public computers">
            <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 accent-brand-600" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-100">Forgot password?</Link>
        </div>

        <Button type="submit" variant="brand" className="h-11 w-full text-sm" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
