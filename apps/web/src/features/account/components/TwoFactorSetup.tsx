import QRCode from 'qrcode';
import { type FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { type TwoFactorMethod, useConfirmSetup, useRefreshTwoFactor, useStartSetup } from '../api';
import { RecoveryCodes } from './RecoveryCodes';

const METHODS: Array<{ value: TwoFactorMethod; title: string; text: string; icon: 'mail' | 'lock' }> = [
  { value: 'email', title: 'Email me a code', text: 'Each time you sign in, we email you a 6-digit code. Nothing to install.', icon: 'mail' },
  { value: 'app', title: 'Authenticator app', text: 'Codes from an app like Google or Microsoft Authenticator. Works offline; the most secure choice.', icon: 'lock' },
];

/**
 * Turn on two-factor sign-in: choose email codes or an authenticator app, confirm the
 * password, prove a code arrives, then save the recovery codes.
 */
export function TwoFactorSetup({ onDone }: { onDone?: () => void }) {
  const start = useStartSetup();
  const confirm = useConfirmSetup();
  const refresh = useRefreshTwoFactor();
  const [method, setMethod] = useState<TwoFactorMethod>('email');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const setup = start.data;

  useEffect(() => {
    if (setup?.otpauth_uri) {
      void QRCode.toDataURL(setup.otpauth_uri, { margin: 1, width: 200 }).then(setQr);
    }
  }, [setup]);

  const startError = start.error instanceof ApiError ? start.error : null;
  const confirmError = confirm.error instanceof ApiError ? confirm.error : null;

  if (confirm.data) {
    return (
      <div className="space-y-4">
        <Alert>Two-factor sign-in is on. Next time you sign in, enter the {setup?.method === 'email' ? 'code we email you' : 'code from your app'} after your password.</Alert>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Save your recovery codes</h3>
        <RecoveryCodes codes={confirm.data.recovery_codes} />
        <Button variant="primary" onClick={() => { refresh(); onDone?.(); }}>I've saved them, continue</Button>
      </div>
    );
  }

  if (!setup) {
    return (
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); start.mutate({ password, method }); }} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">How should we send your codes?</legend>
          {METHODS.map((option) => (
            <label key={option.value} className={cx('flex cursor-pointer gap-3 rounded-card border p-3', method === option.value ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-700/10' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700')}>
              <input type="radio" name="two-factor-method" value={option.value} checked={method === option.value} onChange={() => setMethod(option.value)} className="mt-1 accent-brand-600" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-white"><Icon name={option.icon} className="h-4 w-4" /> {option.title}</span>
                <span className="block text-xs text-zinc-600 dark:text-zinc-400">{option.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Your password" error={startError?.field('password')}>
          <input type="password" autoComplete="current-password" required className={`${inputClass} h-11`} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {startError && !startError.body.fields && <Alert tone="danger">{startError.body.message}</Alert>}
        <Button type="submit" variant="brand" className="h-11 w-full" disabled={start.isPending || password === ''}>
          {start.isPending ? 'Please wait…' : method === 'email' ? 'Email me a code' : 'Continue'}
        </Button>
      </form>
    );
  }

  const codeField = (
    <Field label={setup.method === 'email' ? '6-digit code from the email' : '6-digit code from the app'} error={confirmError?.field('code')}>
      <input autoFocus required inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" className={`${inputClass} h-12 text-center font-mono text-lg tracking-[0.3em]`} value={code} onChange={(event) => setCode(event.target.value)} />
    </Field>
  );

  return (
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); confirm.mutate(code.replace(/\s+/g, '')); }} className="space-y-4">
      {setup.method === 'email' ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We emailed a 6-digit code to <strong className="text-zinc-900 dark:text-white">{setup.sent_to}</strong>. It expires in 10 minutes. Check your spam folder if it isn't there.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="grid h-[200px] w-[200px] shrink-0 place-items-center rounded-card border border-zinc-200 bg-white p-1 dark:border-zinc-700">
            {qr ? <img src={qr} alt="QR code for your authenticator app" width={200} height={200} /> : <span className="text-xs text-zinc-500">Making QR code…</span>}
          </div>
          <div className="min-w-0 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>Scan this with your authenticator app.</p>
            <p>Can't scan? Choose "enter a setup key" in the app and type:</p>
            <p className="rounded-control bg-zinc-100 px-2 py-1.5 font-mono text-xs break-all text-zinc-900 select-all dark:bg-zinc-800 dark:text-zinc-100">{setup.secret?.match(/.{1,4}/g)?.join(' ')}</p>
          </div>
        </div>
      )}
      {codeField}
      <Button type="submit" variant="brand" className="h-11 w-full" disabled={confirm.isPending || code.replace(/\s+/g, '').length !== 6}>{confirm.isPending ? 'Checking…' : 'Turn on two-factor sign-in'}</Button>
      <div className="flex justify-between text-xs">
        {setup.method === 'email' ? (
          <button type="button" className="font-medium text-brand-700 hover:underline dark:text-brand-100" disabled={start.isPending} onClick={() => start.mutate({ password, method: 'email' })}>Send a new code</button>
        ) : <span />}
        <button type="button" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white" onClick={() => { start.reset(); confirm.reset(); setCode(''); }}>Choose another way</button>
      </div>
    </form>
  );
}
