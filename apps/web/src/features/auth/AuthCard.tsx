import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/ui/Icon';

/**
 * The clean, centered layout shared by sign-in, two-factor, forgot and reset password:
 * a soft background, one card with the logo, a title, and the form. Nothing else.
 */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-50 font-sans dark:bg-zinc-950">
      {/* A faint brand glow behind the card. */}
      <div aria-hidden="true" className="pointer-events-none absolute top-[-18rem] left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-700/20" />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm">CC</span>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">CommunityCare</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
          Public directory <Icon name="right" className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-7 shadow-xl shadow-zinc-900/[0.04] sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-7 text-center">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-700/20 dark:text-brand-100 dark:ring-brand-700/40">
                <Icon name="shield" className="h-6 w-6" />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
            </div>
            <div className="space-y-5">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-xs text-zinc-500">{footer}</div>}
        </div>
      </main>

      <footer className="relative pb-6 text-center text-[11px] text-zinc-400">Authorized personnel only · Activity is logged</footer>
    </div>
  );
}
