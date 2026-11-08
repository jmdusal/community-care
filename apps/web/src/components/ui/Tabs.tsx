import { cx } from '../../lib/cx';

export type TabItem<T extends string> = { value: T; label: string; count?: number };

/** Underlined tabs with optional counts (e.g. status filters). */
export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (value: T) => void; items: Array<TabItem<T>>; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cx('-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition', value === item.value ? 'border-brand-500 font-medium text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300')}
        >
          {item.label}
          {item.count !== undefined && <span className="rounded-md bg-zinc-100 px-1.5 text-[11px] text-zinc-500 tabular-nums dark:bg-zinc-800">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
