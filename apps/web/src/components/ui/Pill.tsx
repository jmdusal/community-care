import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type Tone = 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'zinc';

const tones: Record<Tone, string> = {
  teal: 'text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-500/10',
  emerald: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
  amber: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
  rose: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/10',
  sky: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
  violet: 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/10',
  zinc: 'text-zinc-600 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-500/15',
};

export function Pill({ tone = 'zinc', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium', tones[tone])}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
