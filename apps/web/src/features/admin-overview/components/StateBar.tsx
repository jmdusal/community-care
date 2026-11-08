/** A segmented 100% bar of states with a labelled legend (color is never the only cue). */
export function StateBar({ items, label }: { items: Array<{ key: string; label: string; value: number; color: string }>; label: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="img" aria-label={`${label}: ${items.map((item) => `${item.label} ${item.value}`).join(', ')}`}>
        {total > 0 &&
          items
            .filter((item) => item.value > 0)
            .map((item) => (
              <div key={item.key} title={`${item.label}: ${item.value.toLocaleString()}`} style={{ width: `${Math.max((item.value / total) * 100, 1)}%`, background: item.color }} />
            ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-zinc-500">
              <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </span>
            <span className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">{item.value.toLocaleString()}</span>
            <span className="ml-1 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">{total ? `${Math.round((item.value / total) * 100)}%` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
