/**
 * Horizontal bars for a few categories (magnitude, one hue): the label on the left, the
 * value at the bar's tip in text colour, never inside the bar.
 */
export function BarList({ rows, label }: { rows: Array<{ label: string; value: number }>; label: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="space-y-2" aria-label={label}>
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-xs">
          <span className="truncate text-zinc-600 dark:text-zinc-400">{row.label}</span>
          <span className="flex items-center gap-2">
            <span className="block h-3 max-w-[calc(100%-3rem)] rounded-r bg-brand-600" style={{ width: row.value === 0 ? 0 : `max(${(row.value / max) * 100}%, 2px)` }} />
            <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{row.value.toLocaleString()}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
