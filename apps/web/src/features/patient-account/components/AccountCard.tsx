import type { ReactNode } from 'react';

/** Centered card for the public sign-in and sign-up pages. */
export function AccountCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-card border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        <div className="mt-6 space-y-4">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">{footer}</div>}
    </div>
  );
}
