import { type ReactNode, useEffect } from 'react';

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-zinc-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full overflow-y-auto ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} rounded-card border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900`} onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
          {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
        </div>
        <div className="space-y-4 p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-card border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">{footer}</div>}
      </div>
    </div>
  );
}
