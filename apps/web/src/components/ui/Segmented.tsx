import { cx } from '../../lib/cx';

/** A small set of mutually exclusive choices shown side by side. */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx('h-7 rounded-md px-2.5 font-medium transition', value === option.value ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white' : 'text-zinc-600 hover:text-zinc-800 dark:text-zinc-400')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
