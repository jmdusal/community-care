import { useEffect, useRef, useState } from 'react';
import { useFacilityOptions } from '../../lib/catalog';
import { type Scope, scopeParams } from '../../lib/scope';
import { cx } from '../../lib/cx';
import { useDebouncedValue } from '../../lib/useLiveSearch';
import { Icon } from '../ui/Icon';
import { SearchInput } from '../ui/SearchInput';

export type PickedFacility = { id: string; name: string };

/**
 * Pick several facilities (team assignments, program participants). Click to open a
 * dropdown that lists facilities A–Z right away, type to search, tick as many as needed.
 * Chosen facilities stay above as removable chips. With a top-bar scope, only that
 * facility or region's facilities are offered (existing choices outside it stay as chips).
 */
export function FacilityMultiPicker({ value, onChange, label = 'Assigned facilities', scope }: {
  value: PickedFacility[];
  onChange: (value: PickedFacility[]) => void;
  label?: string;
  /** The top-bar scope: options are limited to that facility or region. */
  scope?: Scope;
  /** Kept for callers that still pass it; the dropdown uses checkboxes. */
  addLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const query = useDebouncedValue(text, 250);
  const scoped = Boolean(scope?.facilityId || scope?.regionCode);
  const options = useFacilityOptions(query, open, scope ? scopeParams(scope) : {});
  const list = options.data?.data ?? [];
  const chosen = new Set(value.map((facility) => facility.id));

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (event: MouseEvent) => !root.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (facility: PickedFacility) =>
    onChange(chosen.has(facility.id) ? value.filter((item) => item.id !== facility.id) : [...value, { id: facility.id, name: facility.name }]);

  return (
    <div ref={root} className="space-y-2">
      <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Selected: ${label}`}>
          {value.map((facility) => (
            <li key={facility.id} className="inline-flex items-center gap-1 rounded-md border border-brand-100 bg-brand-50 py-0.5 pr-1 pl-2 text-xs text-brand-700 dark:border-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
              {facility.name}
              <button type="button" aria-label={`Remove ${facility.name}`} className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-700/40" onClick={() => toggle(facility)}><Icon name="x" className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-9 w-full items-center gap-2 rounded-control border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <Icon name="building" className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="flex-1">{value.length ? `${value.length} selected · add or remove` : 'Choose facilities'}</span>
          <Icon name="right" className={cx('h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 transition-transform', open ? '-rotate-90' : 'rotate-90')} />
        </button>

        {open && (
          <div className="absolute right-0 left-0 z-30 mt-1 overflow-hidden rounded-card border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
              <SearchInput autoFocus className="h-9" aria-label={`Search facilities: ${label}`} placeholder="Search by facility name or ID" value={text} busy={options.isFetching} onChange={(event) => setText(event.target.value)} onClear={() => setText('')} />
            </div>
            <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-64 overflow-y-auto py-1">
              {list.map((facility) => {
                const isChosen = chosen.has(facility.id);

                return (
                  <li key={facility.id} role="option" aria-selected={isChosen}>
                    <button type="button" onClick={() => toggle(facility)} className={cx('flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800', isChosen && 'bg-brand-50/60 dark:bg-brand-700/10')}>
                      <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded border', isChosen ? 'border-brand-700 bg-brand-700 text-white' : 'border-zinc-300 dark:border-zinc-600')}>
                        {isChosen && <Icon name="check" className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-zinc-900 dark:text-zinc-100">{facility.name}</span>
                      {facility.city && <span className="shrink-0 text-xs text-zinc-500">{facility.city}</span>}
                    </button>
                  </li>
                );
              })}
              {options.isPending && <li className="px-3 py-3 text-sm text-zinc-500">Loading facilities…</li>}
              {!options.isPending && list.length === 0 && <li className="px-3 py-3 text-sm text-zinc-500">No facility matches “{text.trim()}”.</li>}
            </ul>
            {scoped && (
              <p className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                Showing {scope?.name ?? 'the selected scope'} only. Choose "All facilities" in the top bar to see every facility.
              </p>
            )}
            <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800">
              <span>{options.data && options.data.meta.total > list.length ? `Showing ${list.length} of ${options.data.meta.total}. Type to narrow down.` : `${list.length} ${list.length === 1 ? 'facility' : 'facilities'}`}</span>
              <button type="button" className="font-medium text-brand-700 hover:underline dark:text-brand-100" onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
