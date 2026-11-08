import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { NotificationBell } from '../../components/shared/NotificationBell';
import { ScopePicker } from '../../components/shared/ScopePicker';
import { Icon } from '../../components/ui/Icon';
import { cx } from '../../lib/cx';
import { ScopeProvider, scopeKey, useScope } from '../../lib/scope';
import { useLogout, useMe } from '../../features/auth/useAuth';
import { allNav, BUILT_PHASE, type NavItem, primaryNav, visibleNav, workspaceNav } from '../navigation';

const THEME_KEY = 'communitycare.theme';

function readStoredTheme(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark';
  } catch {
    return false;
  }
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'flex h-8 items-center gap-2.5 rounded-control px-2.5 text-sm transition',
          isActive
            ? 'bg-white font-semibold text-zinc-950 shadow-sm ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700'
            : 'font-medium text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-100 dark:hover:bg-zinc-800/70',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} className={cx('h-4 w-4 shrink-0', isActive ? 'text-brand-600 dark:text-brand-500' : 'text-zinc-800 dark:text-zinc-200')} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.phase > BUILT_PHASE && <span className="text-[10px] font-semibold text-zinc-500 tabular-nums">P{item.phase}</span>}
        </>
      )}
    </NavLink>
  );
}

/** Top-bar scope picker; pages that cover the whole system show it disabled. */
function TopBarScope({ scoped }: { scoped: boolean }) {
  const me = useMe();
  const { scope, setScope } = useScope();

  if (!me.data) {
    return null;
  }

  return <ScopePicker user={me.data} scope={scope} onChange={setScope} disabled={!scoped} disabledReason="This page covers the whole system, not one facility or region." />;
}

/** Pages restart (page 1, closed panels) when the scope changes. */
function ScopedOutlet() {
  const { scope } = useScope();

  return <Outlet key={scopeKey(scope)} />;
}

export function AdminLayout() {
  const me = useMe();

  // RequireAuth has already loaded the person, so the starting scope is known before any page loads.
  if (!me.data) {
    return null;
  }

  return (
    // Re-decide the scope whenever the person or their assigned facilities change (no reload needed).
    <ScopeProvider key={`${me.data.id}:${(me.data.facilities ?? []).map((facility) => facility.id).join(',')}`} owner={me.data}>
      <AdminShell />
    </ScopeProvider>
  );
}

function AdminShell() {
  const [dark, setDark] = useState(readStoredTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = allNav.find((item) => item.path === location.pathname) ?? (location.pathname === '/admin/account' ? { path: '/admin/account', label: 'My account', icon: 'user' as const, phase: 8, summary: '' } : primaryNav[0]);
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable (private mode); the theme still works for this visit.
    }
  }, [dark]);

  return (
    <div className="min-h-screen font-sans">
      <div className={cx('fixed inset-0 z-30 bg-zinc-950/40 lg:hidden', menuOpen ? 'block' : 'hidden')} onClick={() => setMenuOpen(false)} />

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform dark:border-zinc-800 dark:bg-zinc-950',
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="grid h-7 w-7 place-items-center rounded-control bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">CC</span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-white">CommunityCare</span>
            <span className="block text-[11px] text-zinc-500">Admin console</span>
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Admin">
          {visibleNav(primaryNav, me.data?.permissions).map((item) => (
            <SidebarLink key={item.path} item={item} onNavigate={() => setMenuOpen(false)} />
          ))}
          {visibleNav(workspaceNav, me.data?.permissions).length > 0 && <div className="px-2.5 pt-5 pb-1.5 text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">Workspace</div>}
          {visibleNav(workspaceNav, me.data?.permissions).map((item) => (
            <SidebarLink key={item.path} item={item} onNavigate={() => setMenuOpen(false)} />
          ))}
        </nav>

        {/* <p className="px-4 pb-2 text-[11px] text-zinc-500">P = roadmap phase in which a screen is built.</p> */}
        <div className="flex items-center gap-2.5 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
            {(me.data?.name ?? '?').split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{me.data?.name}</div>
            <div className="truncate text-[11px] text-zinc-500">{me.data?.roles.map((role) => role.replaceAll('_', ' ')).join(', ')}</div>
          </div>
          <NavLink to="/admin/account" onClick={() => setMenuOpen(false)} className="rounded-control p-1.5 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label="My account" title="My account">
            <Icon name="shield" />
          </NavLink>
          <button
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
            className="rounded-control p-1.5 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/80">
          <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <span className="hidden text-zinc-500 dark:text-zinc-400 sm:inline">CommunityCare</span>
            <Icon name="right" className="hidden h-3.5 w-3.5 text-zinc-300 sm:block dark:text-zinc-600" />
            <span className="truncate font-medium text-zinc-900 dark:text-white">{current.label}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <TopBarScope scoped={current.scoped === true} />
            {me.data && <NotificationBell userPublicId={me.data.id} />}
          </div>
          <button className="rounded-control p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
            <Icon name={dark ? 'sun' : 'moon'} />
          </button>
        </header>

        <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ScopedOutlet />
        </main>
      </div>
    </div>
  );
}
