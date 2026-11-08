import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ApiError } from '../../lib/api';
import { TwoFactorSetup } from '../account/components/TwoFactorSetup';
import { AuthCard } from './AuthCard';
import { useMe } from './useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) {
    return <div className="grid min-h-screen place-items-center text-sm text-zinc-500">Loading…</div>;
  }

  if (me.error instanceof ApiError && me.error.status === 401) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (me.error) {
    return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-zinc-600">Could not reach the API. Check that Herd serves communitycare-api.test and MySQL is running.</div>;
  }

  // Patients have no admin console: send them to their own appointments.
  if (me.data && !me.data.is_team_member) {
    return <Navigate to="/account/appointments" replace />;
  }

  // Administrators and verifiers must turn on two-factor sign-in first (the API enforces it too).
  if (me.data?.two_factor?.required && !me.data.two_factor.enabled) {
    return (
      <AuthCard title="Set up two-factor sign-in" subtitle="Required for admins, facility admins and verifiers. It takes about a minute.">
        <TwoFactorSetup />
      </AuthCard>
    );
  }

  return children;
}
