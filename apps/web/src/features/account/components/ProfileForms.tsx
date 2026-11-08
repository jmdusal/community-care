import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { ApiError } from '../../../lib/api';
import type { CurrentUser } from '../../auth/useAuth';
import { useChangePassword, useUpdateProfile } from '../api';

/** Name and mobile. Email stays fixed because it is the sign-in and the code channel. */
export function ProfileForm({ user, mobileRequired = false }: { user: CurrentUser; mobileRequired?: boolean }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile ?? '');

  useEffect(() => {
    setName(user.name);
    setMobile(user.mobile ?? '');
  }, [user.name, user.mobile]);

  const fieldError = (field: string) => (update.error instanceof ApiError ? update.error.field(field) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ name: name.trim(), mobile: mobile.trim() || null });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" hint="Your sign-in. Ask an administrator if it needs to change.">
        <input className={inputClass} value={user.email} disabled />
      </Field>
      <Field label="Full name" error={fieldError('name')}>
        <input className={inputClass} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
      </Field>
      <Field label="Mobile" hint={mobileRequired ? 'Clinics call this number about your appointments.' : 'Optional.'} error={fieldError('mobile')}>
        <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={mobile} onChange={(event) => setMobile(event.target.value)} required={mobileRequired} />
      </Field>
      <Button type="submit" variant="primary" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save profile'}</Button>
    </form>
  );
}

/** Change password: needs the current one; signs out other devices. */
export function PasswordForm() {
  const change = useChangePassword();
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const fieldError = (field: string) => (change.error instanceof ApiError ? change.error.field(field) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    change.mutate(form, { onSuccess: () => setForm({ current_password: '', password: '', password_confirmation: '' }) });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Current password" error={fieldError('current_password')}>
        <input className={inputClass} type="password" autoComplete="current-password" value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="At least 6 characters, with letters and numbers." error={fieldError('password')}>
          <input className={inputClass} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} />
        </Field>
        <Field label="Repeat new password" error={fieldError('password_confirmation')}>
          <input className={inputClass} type="password" autoComplete="new-password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} required minLength={6} />
        </Field>
      </div>
      <Button type="submit" variant="primary" disabled={change.isPending}>{change.isPending ? 'Changing…' : 'Change password'}</Button>
    </form>
  );
}
