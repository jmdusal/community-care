import { type FormEvent, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, inputClass } from '../../components/ui/Field';
import { PageHead } from '../../components/ui/PageHead';
import { Panel } from '../../components/ui/Panel';
import { Pill } from '../../components/ui/Pill';
import { ApiError } from '../../lib/api';
import { useMe } from '../auth/useAuth';
import { useDisableTwoFactor, useForgetDevices, useNewRecoveryCodes, useTwoFactorStatus } from './api';
import { PasswordForm, ProfileForm } from './components/ProfileForms';
import { RecoveryCodes } from './components/RecoveryCodes';
import { TwoFactorSetup } from './components/TwoFactorSetup';

/** The signed-in person's account: profile, password, and two-factor sign-in (status, recovery codes, turn off). */
export function AccountSecurityPage() {
  const me = useMe();
  const status = useTwoFactorStatus();
  const newCodes = useNewRecoveryCodes();
  const disable = useDisableTwoFactor();
  const forget = useForgetDevices();
  const [action, setAction] = useState<'codes' | 'disable' | null>(null);
  const [password, setPassword] = useState('');
  const data = status.data;
  const error = (action === 'codes' ? newCodes.error : disable.error) instanceof ApiError ? ((action === 'codes' ? newCodes.error : disable.error) as ApiError) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const done = { onSuccess: () => { setPassword(''); setAction(null); } };
    if (action === 'codes') {
      newCodes.mutate(password, { onSuccess: () => setPassword('') });
    } else if (action === 'disable') {
      disable.mutate(password, done);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHead title="My account" description="Your profile, password and two-factor sign-in." />

      {me.data && (
        <Panel title="Profile">
          <div className="px-5 pb-5"><ProfileForm user={me.data} /></div>
        </Panel>
      )}

      <Panel title="Password" description="Changing it signs you out on other devices.">
        <div className="px-5 pb-5"><PasswordForm /></div>
      </Panel>

      <Panel
        title="Two-factor sign-in"
        description="After your password, a 6-digit code sent by email or shown in an authenticator app."
        action={data && <Pill tone={data.enabled ? 'emerald' : 'zinc'} dot>{data.enabled ? 'On' : 'Off'}</Pill>}
      >
        <div className="space-y-4 px-5 pb-5">
          {data && !data.enabled && <TwoFactorSetup />}

          {data?.enabled && (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Codes come from: <strong className="text-zinc-900 dark:text-white">{data.method === 'email' ? 'email' : 'your authenticator app'}</strong> ·
                Recovery codes left: <strong className="text-zinc-900 dark:text-white">{data.recovery_codes_left}</strong>
                {data.recovery_codes_left <= 2 && ' · make new ones soon'}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Remembered devices: <strong className="text-zinc-900 dark:text-white">{data.remembered_devices ?? 0}</strong>
                  <span className="block text-xs text-zinc-500">They skip the code for {data.remember_days ?? 30} days. Changing your password also forgets them.</span>
                </span>
                {(data.remembered_devices ?? 0) > 0 && <Button className="h-8 text-xs" disabled={forget.isPending} onClick={() => forget.mutate()}>Forget all devices</Button>}
              </div>
              {data.required && <p className="text-xs text-zinc-500">Your role requires two-factor sign-in, so it can't be turned off. If you get a new phone, ask another administrator to reset it.</p>}

              {newCodes.data && <RecoveryCodes codes={newCodes.data.recovery_codes} />}

              {action ? (
                <form onSubmit={submit} className="space-y-3 rounded-card border border-zinc-200 p-4 dark:border-zinc-800">
                  <Field label="Confirm with your password" error={error?.field('password')}>
                    <input type="password" autoFocus required autoComplete="current-password" className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} />
                  </Field>
                  {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
                  <div className="flex gap-2">
                    <Button type="submit" variant={action === 'disable' ? 'danger' : 'primary'} disabled={password === '' || newCodes.isPending || disable.isPending}>
                      {action === 'disable' ? 'Turn off' : 'Make new codes'}
                    </Button>
                    <Button onClick={() => { setAction(null); setPassword(''); }}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => { setAction('codes'); newCodes.reset(); }}>Make new recovery codes</Button>
                  {!data.required && <Button variant="danger" onClick={() => setAction('disable')}>Turn off</Button>}
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
