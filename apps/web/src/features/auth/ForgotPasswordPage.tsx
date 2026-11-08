import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { IconInput } from './components/IconInput';
import { apiRequest } from '../../lib/api';
import { AuthCard } from './AuthCard';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }).catch(() => undefined);
    setSent(true);
  };

  return (
    <AuthCard title="Reset your password" subtitle="We will email you a link to choose a new password.">
      {sent ? (
        <Alert>If that email has an account, a reset link is on its way.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><IconInput icon="mail" type="email" required placeholder="you@agency.gov.ph" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Button type="submit" variant="brand" className="h-11 w-full">Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="block text-center text-xs font-medium text-brand-700 hover:underline dark:text-brand-100">Back to sign in</Link>
    </AuthCard>
  );
}
