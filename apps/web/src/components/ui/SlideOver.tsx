import { type ReactNode, useEffect } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

/** A right-hand side panel for details and forms. Closes on Escape or backdrop click. */
export function SlideOver({ open, onClose, title, description, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div onClick={onClose} className={cx('fixed inset-0 z-40 bg-zinc-950/30 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      {/* A clipping frame: the closed panel waits off-screen without making the page wider. */}
      <div className={cx('fixed inset-0 z-50 overflow-hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <aside
        role="dialog"
        aria-modal="true"
        inert={!open}
        aria-label={title}
        className={cx('pointer-events-auto absolute inset-y-0 right-0 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 sm:w-[580px] dark:border-zinc-800 dark:bg-zinc-900', open ? 'translate-x-0' : 'translate-x-full')}
      >
        <div className="flex items-start gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">{open && children}</div>
        {footer && open && <div className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">{footer}</div>}
      </aside>
      </div>
    </>
  );
}
