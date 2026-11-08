import { Icon } from '../../../components/ui/Icon';
import { Pill, type Tone } from '../../../components/ui/Pill';
import { cx } from '../../../lib/cx';
import { formatDate } from '../../../lib/format';
import type { AuditEntry } from '../api';

const tones: Record<string, Tone> = { facility: 'teal', import: 'sky', user: 'violet', settings: 'zinc' };

function JsonBox({ label, value, tone }: { label: string; value: unknown; tone: string }) {
  return (
    <div className="overflow-hidden rounded-control border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-800">{label}</div>
      <pre className={cx('px-3 py-2 font-mono text-xs whitespace-pre-wrap', value ? tone : 'text-zinc-500 dark:text-zinc-400')}>{value ? JSON.stringify(value, null, 2) : '—'}</pre>
    </div>
  );
}

/** One audit event; expands to show redacted before/after values. */
export function AuditRow({ entry, open, onToggle }: { entry: AuditEntry; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={cx('cursor-pointer border-b border-zinc-100 transition dark:border-zinc-800', open ? 'bg-zinc-50 dark:bg-zinc-800/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50')} onClick={onToggle}>
        <td className="py-3 pr-2 pl-4 text-zinc-500 dark:text-zinc-400">
          <button aria-expanded={open} aria-label={open ? 'Hide details' : 'Show details'}><Icon name="right" className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} /></button>
        </td>
        <td className="px-2 py-3 text-xs whitespace-nowrap text-zinc-500 tabular-nums">{formatDate(entry.created_at)}</td>
        <td className="px-3 py-3 whitespace-nowrap text-zinc-900 dark:text-zinc-100">{entry.actor}</td>
        <td className="px-3 py-3 whitespace-nowrap">
          <span className="flex items-center gap-2"><Pill tone={tones[entry.category] ?? 'zinc'}>{entry.category}</Pill><code className="text-xs text-zinc-700 dark:text-zinc-300">{entry.action}</code></span>
        </td>
        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">{entry.resource_id ?? '—'}</td>
        <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">{entry.ip_masked ?? '—'}</td>
      </tr>
      {open && (
        <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40">
          <td colSpan={6} className="px-4 pt-1 pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <JsonBox label="Before" value={entry.before} tone="text-rose-700 dark:text-rose-300" />
              <JsonBox label="After" value={entry.after} tone="text-emerald-700 dark:text-emerald-300" />
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{entry.resource_type} · request {entry.request_id ?? '—'}</p>
          </td>
        </tr>
      )}
    </>
  );
}
