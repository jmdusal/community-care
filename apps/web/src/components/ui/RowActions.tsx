import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';

export type RowAction = {
  label: string;
  icon?: IconName;
  onClick?: () => void;
  /** A link instead of a button. */
  to?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Hidden actions are left out (handy for conditional entries). */
  hidden?: boolean;
};

const MENU_WIDTH = 192;

/**
 * The "⋯" button at the end of a table row, opening a small menu of that row's actions.
 * The menu is positioned against the window, so table scroll containers never clip it.
 * Closes on Escape, an outside click, scrolling, or choosing an action.
 */
export function RowActions({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const visible = actions.filter((action) => !action.hidden);

  useLayoutEffect(() => {
    if (!open || !button.current) {
      return;
    }
    const rect = button.current.getBoundingClientRect();
    const height = visible.length * 36 + 8;
    const up = rect.bottom + height + 8 > window.innerHeight && rect.top > height;
    setPosition({ top: up ? rect.top - height - 4 : rect.bottom + 4, left: Math.max(8, rect.right - MENU_WIDTH), up });
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => setOpen(false);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) {
        close();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    menu.current?.querySelector<HTMLElement>('[role=menuitem]:not([aria-disabled=true])')?.focus();

    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (visible.length === 0) {
    return null;
  }

  const itemClass = (action: RowAction) => cx(
    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none',
    action.disabled ? 'cursor-not-allowed text-zinc-400 dark:text-zinc-600' : action.tone === 'danger'
      ? 'text-rose-700 hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10'
      : 'text-zinc-800 hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800',
  );

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not([aria-disabled=true])') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => { event.stopPropagation(); setOpen((current) => !current); }}
        className={cx('inline-grid h-8 w-8 place-items-center rounded-control text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white', open && 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white')}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          onClick={(event) => event.stopPropagation()}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 rounded-card border border-zinc-200 bg-white p-1 text-left shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          {visible.map((action) => {
            const content = <>{action.icon && <Icon name={action.icon} className="h-4 w-4 shrink-0 opacity-70" />}<span className="truncate">{action.label}</span></>;

            return action.to && !action.disabled ? (
              <Link key={action.label} role="menuitem" to={action.to} className={itemClass(action)} onClick={() => setOpen(false)}>{content}</Link>
            ) : (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                aria-disabled={action.disabled || undefined}
                className={itemClass(action)}
                onClick={() => {
                  if (action.disabled) {
                    return;
                  }
                  setOpen(false);
                  action.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Header cell for the actions column, matching the "⋯" button below it. */
export function ActionsHeader() {
  return <th className="w-14 px-4 py-2.5 text-right font-medium">Action</th>;
}
