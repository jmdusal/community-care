import { type InputHTMLAttributes, useState } from 'react';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { cx } from '../../../lib/cx';

const base =
  'h-11 w-full rounded-control border bg-white pl-10 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:bg-zinc-950 dark:text-zinc-100';

/** Larger auth input with a leading icon; password inputs get a show/hide toggle. */
export function IconInput({ icon, invalid, type = 'text', className, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: IconName; invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 dark:text-zinc-400"><Icon name={icon} /></span>
      <input
        {...props}
        type={isPassword && visible ? 'text' : type}
        aria-invalid={invalid || undefined}
        className={cx(base, isPassword ? 'pr-11' : 'pr-3', invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : 'border-zinc-200 dark:border-zinc-700', className)}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-1.5 my-1.5 grid w-8 place-items-center rounded-control text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      )}
    </div>
  );
}
