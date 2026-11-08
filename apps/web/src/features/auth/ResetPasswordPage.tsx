import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { IconInput } from './components/IconInput';
import { ApiError, apiRequest } from '../../lib/api';
import { AuthCard } from './AuthCard';

/** Sets a password from an email link: accepting an invitation or resetting a forgotten password. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const invite = params.get('invite') === '1';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState('saving');
    setError(null);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: params.get('token'), email: params.get('email'), password, password_confirmation: confirmation }),
      });
      setState('done');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : null);
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <AuthCard title={invite ? 'Welcome aboard' : 'Password updated'}>
        <Alert>Your password is set.</Alert>
        <Link to="/login" className="block text-center text-sm font-medium text-brand-700 hover:underline">Sign in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={invite ? 'Accept your invitation' : 'Choose a new password'} subtitle={params.get('email') ?? undefined}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 6 characters with letters and numbers." error={error?.field('password')}>
          <IconInput icon="lock" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Repeat password">
          <IconInput icon="lock" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </Field>
        {error?.field('email') && <Alert tone="danger">{error.field('email')} Ask for a new link.</Alert>}
        <Button type="submit" variant="brand" className="h-11 w-full" disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Set password'}</Button>
      </form>
    </AuthCard>
  );
}
