import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

const tones = {
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
};

/** A full-width notice with an icon and optional trailing action. */
export function Alert({ tone = 'info', children, action }: { tone?: keyof typeof tones; children: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex flex-wrap items-center gap-3 rounded-card border px-4 py-3 text-sm', tones[tone])}>
      <Icon name="alert" className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
