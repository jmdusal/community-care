import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Field, inputClass } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { ApiError } from '../../lib/api';
import { useDeleteAccount } from '../account/api';
import { PasswordForm, ProfileForm } from '../account/components/ProfileForms';
import { useLogout, useMe } from '../auth/useAuth';
import { isStaff } from './api';

/** A patient's account: profile, password, sign out, and deleting the account. */
export function ProfilePage() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const remove = useDeleteAccount();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');

  if (me.error instanceof ApiError && me.error.status === 401) {
    return <Navigate to="/account/sign-in?next=/account/profile" replace />;
  }
  if (me.data && isStaff(me.data)) {
    return <Navigate to="/admin/account" replace />;
  }
  if (!me.data) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const confirmDelete = (event: FormEvent) => {
    event.preventDefault();
    remove.mutate(password, { onSuccess: () => navigate('/', { replace: true }) });
  };

  const section = 'rounded-card border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">My account</h1>
          <p className="mt-1 text-sm text-zinc-500">Clinics see your name and mobile when you request an appointment.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/account/appointments" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-100">My appointments</Link>
        </div>
      </div>

      <section className={section}>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Profile</h2>
        <ProfileForm user={me.data} mobileRequired />
      </section>

      <section className={section}>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Password</h2>
        <PasswordForm />
      </section>

      <section className={section}>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Sign out or delete</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-500">Deleting cancels your upcoming appointments. Past visits stay with the clinic under your name only.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })} disabled={logout.isPending}>Sign out</Button>
          <Button variant="danger" onClick={() => setDeleting(true)}>Delete my account</Button>
        </div>
      </section>

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        description="This cannot be undone."
        footer={(
          <>
            <Button onClick={() => setDeleting(false)}>Keep my account</Button>
            <Button type="submit" form="delete-account" variant="danger" disabled={remove.isPending}>{remove.isPending ? 'Deleting…' : 'Delete account'}</Button>
          </>
        )}
      >
        <form id="delete-account" onSubmit={confirmDelete} className="space-y-3">
          {remove.error instanceof ApiError && !remove.error.field('password') && <Alert tone="danger">{remove.error.body.message}</Alert>}
          <Field label="Your password" error={remove.error instanceof ApiError ? remove.error.field('password') : undefined}>
            <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
