import type { ReactNode } from 'react';

/** Input styles without a width, for inputs that set their own (w-28, w-64…). */
export const inputBase =
  'h-9 rounded-control border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

/** Full-width input styles (the default inside a Field). */
export const inputClass = `${inputBase} w-full`;

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[11px] text-rose-700">{error}</span> : hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}
