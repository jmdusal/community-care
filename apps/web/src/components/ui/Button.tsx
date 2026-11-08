import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'brand' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary: 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
  ghost: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
  brand: 'bg-brand-700 text-white hover:bg-teal-800',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-zinc-900 dark:text-rose-400 dark:hover:bg-rose-500/10',
};

/** Button styles, also used on links that should look like buttons (never nest a button in a link). */
export function buttonClass(variant: ButtonVariant = 'secondary', className?: string): string {
  return cx(
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    className,
  );
}

export function Button({ variant = 'secondary', className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
