import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export function Panel({ title, description, action, children, className }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-card border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900', className)}>
      {title && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
