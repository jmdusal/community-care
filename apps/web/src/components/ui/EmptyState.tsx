import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** A dashed placeholder for "nothing here yet" or "no results", with an optional action. */
export function EmptyState({ icon = 'search', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
      <div className="max-w-sm px-6">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-card bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{title}</p>
        {children && <div className="mt-1 text-sm text-zinc-500">{children}</div>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
