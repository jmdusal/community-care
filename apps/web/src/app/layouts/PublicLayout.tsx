import { Link, Outlet, useLocation } from 'react-router';
import { cx } from '../../lib/cx';
import { PublicNav } from './PublicNav';

/**
 * Public directory shell: sticky header (with a one-tap 911 button), content, footer.
 * The home page draws its own full-width hero; the facility page uses a wider column.
 */
export function PublicLayout() {
  const { pathname } = useLocation();
  const home = pathname === '/';
  const wide = pathname.startsWith('/facilities/');

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2.5 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm">CC</span>
            <span className="hidden text-sm font-semibold tracking-tight text-zinc-900 min-[420px]:inline dark:text-white">CommunityCare</span>
          </Link>
          <PublicNav />
        </div>
      </header>

      <main className={cx('flex-1', home ? '' : cx('mx-auto w-full px-4 py-8', wide ? 'max-w-6xl' : 'max-w-4xl'))}>
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">CC</span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">CommunityCare</span>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
              A free directory of public health facilities in the Philippines. Information comes from public sources such as the DOH National Health Facility Registry. "Verified" describes our own review, not a license or accreditation. Always confirm hours and services with the facility.
            </p>
          </div>
          <nav aria-label="Directory" className="space-y-2 text-sm">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Directory</p>
            <Link to="/" className="block text-zinc-700 hover:text-brand-700 dark:text-zinc-300">Find a facility</Link>
            <Link to="/programs" className="block text-zinc-700 hover:text-brand-700 dark:text-zinc-300">Health programs</Link>
            <Link to="/appointments/manage" className="block text-zinc-700 hover:text-brand-700 dark:text-zinc-300">Check a booking</Link>
          </nav>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Emergencies</p>
            <p className="text-xs leading-relaxed text-zinc-500">CommunityCare is not an emergency service. Listings may not show whether a facility can take emergency patients right now.</p>
            <a href="tel:911" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:underline dark:text-rose-300"><span aria-hidden="true">☎</span> Call 911</a>
          </div>
        </div>
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500">© {new Date().getFullYear()} CommunityCare</div>
        </div>
      </footer>
    </div>
  );
}
