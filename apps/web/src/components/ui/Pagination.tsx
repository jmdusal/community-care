import { cx } from '../../lib/cx';
import { Icon } from './Icon';

/** Rows per page on every admin table. */
export const PAGE_SIZE = 10;

/**
 * The footer under every list: "Showing 1–10 of 132 facilities", page numbers and
 * previous / next. Always shown when there is something to count, even on one page,
 * so people can see how many records exist.
 */
export function Pagination({ page, lastPage, total, perPage, onChange, noun = 'results' }: {
  page: number;
  lastPage: number;
  total: number;
  /** Rows per page; defaults to an estimate from total / lastPage. */
  perPage?: number;
  onChange: (page: number) => void;
  noun?: string;
}) {
  if (total === 0) {
    return null;
  }

  const size = perPage ?? Math.ceil(total / Math.max(lastPage, 1));
  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, total);
  const pages = pageNumbers(page, Math.max(lastPage, 1));
  const step = 'inline-grid h-8 min-w-8 place-items-center rounded-control px-2 text-xs font-medium transition';

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing <span className="font-medium text-zinc-800 dark:text-zinc-200">{first.toLocaleString()}–{last.toLocaleString()}</span> of{' '}
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{total.toLocaleString()}</span> {noun}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={cx(step, 'text-zinc-600 enabled:hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <Icon name="right" className="h-3.5 w-3.5 rotate-180" />
        </button>
        {pages.map((item, index) => item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-zinc-400" aria-hidden="true">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            className={cx(step, item === page ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800')}
          >
            {item}
          </button>
        ))}
        <button type="button" className={cx(step, 'text-zinc-600 enabled:hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:enabled:hover:bg-zinc-800')} disabled={page >= lastPage} onClick={() => onChange(page + 1)} aria-label="Next page">
          <Icon name="right" className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}

/** 1 … 4 5 6 … 20: first, last, and the pages around the current one. */
function pageNumbers(page: number, lastPage: number): Array<number | 'gap'> {
  const wanted = new Set([1, lastPage, page - 1, page, page + 1].filter((n) => n >= 1 && n <= lastPage));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) {
      out.push(n - sorted[i - 1] === 2 ? n - 1 : 'gap');
    }
    out.push(n);
  });

  return out;
}

/** Client-side paging for lists the API returns whole (small catalogs, reports). */
export function pageOf<T>(items: T[], page: number, perPage: number): { rows: T[]; lastPage: number; page: number } {
  const lastPage = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, lastPage);

  return { rows: items.slice((current - 1) * perPage, current * perPage), lastPage, page: current };
}
