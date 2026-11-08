import type { ReactNode } from 'react';

/** Label/value rows in a bordered box (provenance, batch details, metadata). */
export function KeyValueList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="divide-y divide-zinc-100 rounded-control border border-zinc-200 text-xs dark:divide-zinc-800 dark:border-zinc-800">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 px-3 py-2">
          <dt className="shrink-0 text-zinc-500">{label}</dt>
          <dd className="text-right text-zinc-800 dark:text-zinc-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
