import { dismissToast, useToasts } from '../../lib/toast';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

/** The toast stack (top right, below the top bar; full width on phones). Read out by screen readers. */
export function Toaster() {
  const toasts = useToasts();

  return (
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:top-16 sm:right-4 sm:w-96">
      {[...toasts].reverse().map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'pointer-events-auto flex items-start gap-3 rounded-card border bg-white px-4 py-3 text-sm shadow-lg dark:bg-zinc-900',
            toast.tone === 'success' ? 'border-emerald-200 dark:border-emerald-500/30' : 'border-rose-200 dark:border-rose-500/30',
          )}
        >
          <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', toast.tone === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300')}>
            <Icon name={toast.tone === 'success' ? 'check' : 'alert'} className="h-3 w-3" />
          </span>
          <p className="min-w-0 flex-1 text-zinc-800 dark:text-zinc-100">{toast.message}</p>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss" className="-mr-1 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
