import type { InputHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

/**
 * Text input with a leading search icon. `busy` swaps the icon for a spinner
 * while results load; `onClear` adds a clear button when there is text.
 */
export function SearchInput({ className, busy = false, onClear, ...props }: InputHTMLAttributes<HTMLInputElement> & { busy?: boolean; onClear?: () => void }) {
  const hasText = typeof props.value === 'string' && props.value.length > 0;

  return (
    <label className={cx('flex h-10 items-center gap-2 rounded-control border border-zinc-200 bg-white px-3 focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-950', className)}>
      <Icon name={busy ? 'refresh' : 'search'} className={cx('h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400', busy && 'animate-spin')} />
      <input type="search" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden dark:text-zinc-100" {...props} />
      {onClear && hasText && (
        <button type="button" onClick={onClear} aria-label="Clear search" className="-mr-1 rounded p-0.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );
}
