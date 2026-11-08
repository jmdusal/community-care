import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type Stat = { label: string; value: ReactNode; sub?: string; tone?: 'default' | 'warning' | 'danger' };

const toneClass = {
  default: 'text-zinc-900 dark:text-white',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-rose-700 dark:text-rose-400',
};

/** A row of headline numbers separated by hairlines. */
export function StatStrip({ items }: { items: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-zinc-200 bg-zinc-200 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800">
      {items.map((item) => (
        <div key={item.label} className="bg-white p-4 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</div>
          <div className={cx('mt-1.5 text-xl font-semibold tracking-tight tabular-nums', toneClass[item.tone ?? 'default'])}>{item.value}</div>
          {item.sub && <div className="mt-0.5 text-[11px] text-zinc-500">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
