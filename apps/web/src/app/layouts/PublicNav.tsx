import { NavLink } from 'react-router';
import { NotificationBell } from '../../components/shared/NotificationBell';
import { Icon } from '../../components/ui/Icon';
import { useMe } from '../../features/auth/useAuth';
import { isStaff } from '../../features/patient-account/api';
import { useAssistantStatus } from '../../lib/assistant';
import { cx } from '../../lib/cx';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cx('rounded-control px-2 py-1.5 text-xs font-medium whitespace-nowrap transition sm:px-2.5', isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white');

/** Public header links: programs, the assistant (when on), and the visitor's account. */
export function PublicNav() {
  const assistant = useAssistantStatus();
  const me = useMe();
  const user = me.data;

  return (
    <nav aria-label="Main" className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-1">
      <NavLink to="/" end className={linkClass}>Home</NavLink>
      <NavLink to="/programs" className={linkClass}><span className="sm:hidden">Programs</span><span className="hidden sm:inline">Health programs</span></NavLink>
      {assistant.data?.enabled && <NavLink to="/assistant" className={linkClass}><span className="sm:hidden">Ask</span><span className="hidden sm:inline">Ask CommunityCare</span></NavLink>}
      {user ? (
        isStaff(user) ? <NavLink to="/admin" className={linkClass}>Admin</NavLink> : (
          <>
            <NavLink to="/account/appointments" className={linkClass}><span className="sm:hidden">Bookings</span><span className="hidden sm:inline">My appointments</span></NavLink>
            <NotificationBell userPublicId={user.id} />
            <NavLink to="/account/profile" className={linkClass} aria-label="My account"><Icon name="user" /></NavLink>
          </>
        )
      ) : (
        <NavLink to="/account/sign-in" className={({ isActive }) => cx(linkClass({ isActive }), 'border border-zinc-200 dark:border-zinc-700')}>Sign in</NavLink>
      )}
      {/* Emergencies: one tap to call, always in the header instead of a full-width banner. */}
      <a href="tel:911" className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30" aria-label="Emergency: call 911">
        <span className="hidden sm:inline">Emergency</span> 911
      </a>
    </nav>
  );
}
