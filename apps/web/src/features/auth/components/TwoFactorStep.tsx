import { type FormEvent, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { ApiError } from '../../../lib/api';
import { type CurrentUser, useResendTwoFactorCode, useTwoFactorChallenge } from '../useAuth';

/** Second sign-in step: the code from the authenticator app (or a one-time recovery code). */
export function TwoFactorStep({ onSignedIn, onCancel, method = 'app', sentTo }: { onSignedIn: (user: CurrentUser) => void; onCancel: () => void; method?: 'app' | 'email'; sentTo?: string }) {
  const challenge = useTwoFactorChallenge();
  const resend = useResendTwoFactorCode();
  const resendError = resend.error instanceof ApiError ? (resend.error.field('code') ?? resend.error.body.message) : null;
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState('');
  // Remember this browser: no code here for 30 days (until the password changes).
  const [rememberDevice, setRememberDevice] = useState(true);
  const error = challenge.error instanceof ApiError ? challenge.error : null;
  const message = error?.field('code') ?? error?.field('recovery_code') ?? (error && !error.body.fields ? error.body.message : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    challenge.mutate({ ...(useRecovery ? { recovery_code: value.trim() } : { code: value.replace(/\s+/g, '') }), remember_device: rememberDevice }, { onSuccess: ({ user }) => onSignedIn(user) });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {useRecovery
          ? 'Enter one of the recovery codes you saved when you set up two-factor sign-in. Each code works once.'
          : method === 'email'
            ? <>We emailed a 6-digit code to <strong className="text-zinc-900 dark:text-white">{sentTo ?? 'your email'}</strong>. It expires in 10 minutes.</>
            : 'Open your authenticator app and enter the 6-digit code for CommunityCare.'}
      </p>
      {method === 'email' && !useRecovery && (resend.isSuccess || resendError) && <Alert tone={resendError ? 'warning' : 'info'}>{resendError ?? 'A new code is on its way. Check your inbox (and spam folder).'}</Alert>}
      {message && <Alert tone="danger">{message}</Alert>}
      <Field label={useRecovery ? 'Recovery code' : 'Authentication code'}>
        <input
          autoFocus
          required
          className={`${inputClass} h-12 text-center font-mono text-lg tracking-[0.3em]`}
          inputMode={useRecovery ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          placeholder={useRecovery ? 'XXXXX-XXXXX' : '123456'}
          maxLength={useRecovery ? 11 : 7}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <label className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} />
        <span>Remember this device for 30 days<span className="block text-xs text-zinc-500">You won't need a code here again. Don't tick this on a shared or public computer.</span></span>
      </label>
      <Button type="submit" variant="brand" className="h-11 w-full" disabled={challenge.isPending || value.trim().length < 6}>{challenge.isPending ? 'Checking…' : 'Verify and sign in'}</Button>
      <div className="flex justify-between text-xs">
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {method === 'email' && !useRecovery && (
            <button type="button" className="font-medium text-brand-700 hover:underline dark:text-brand-100" disabled={resend.isPending} onClick={() => resend.mutate()}>Send a new code</button>
          )}
          <button type="button" className="font-medium text-brand-700 hover:underline dark:text-brand-100" onClick={() => { setUseRecovery(!useRecovery); setValue(''); challenge.reset(); }}>
            {useRecovery ? (method === 'email' ? 'Use the emailed code instead' : 'Use the app code instead') : (method === 'email' ? 'No access to your email? Use a recovery code' : 'Lost your phone? Use a recovery code')}
          </button>
        </span>
        <button type="button" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white" onClick={onCancel}>Start over</button>
      </div>
    </form>
  );
}
