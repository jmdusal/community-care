import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { SearchInput } from '../../../components/ui/SearchInput';
import type { CatalogItem } from '../../../lib/catalog';
import { cx } from '../../../lib/cx';

/**
 * Multi-select for the service catalog: chosen services show as removable chips; the
 * dropdown lists the catalog grouped by category, filters as you type, and toggles on click.
 */
export function ServicesPicker({ catalog, value, onChange }: { catalog: CatalogItem[]; value: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const chosen = new Set(value);
  const bySlug = new Map(catalog.map((service) => [service.slug, service]));

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

  const toggle = (slug: string) => onChange(chosen.has(slug) ? value.filter((item) => item !== slug) : [...value, slug]);

  const needle = text.trim().toLowerCase();
  // Archived services are not offered, but ones this facility already lists stay as chips.
  const matches = catalog.filter((service) => !service.archived).filter((service) => !needle || service.name.toLowerCase().includes(needle) || (service.category ?? '').toLowerCase().includes(needle));
  const groups = new Map<string, CatalogItem[]>();
  for (const service of matches) {
    const key = service.category ?? 'other';
    groups.set(key, [...(groups.get(key) ?? []), service]);
  }

  return (
    <div ref={root} className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected services">
          {value.map((slug) => {
            const service = bySlug.get(slug);
            const name = service ? `${service.name}${service.archived ? ' (archived)' : ''}` : slug;

            return (
              <li key={slug} className="inline-flex items-center gap-1 rounded-md border border-brand-100 bg-brand-50 py-0.5 pr-1 pl-2 text-xs text-brand-700 dark:border-brand-700 dark:bg-brand-700/20 dark:text-brand-100">
                {name}
                <button type="button" aria-label={`Remove ${name}`} className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-700/40" onClick={() => toggle(slug)}><Icon name="x" className="h-3 w-3" /></button>
              </li>
            );
          })}
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
          <Icon name="search" className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="flex-1">{value.length ? `${value.length} selected · add or remove` : 'Choose services'}</span>
          <Icon name="right" className={cx('h-3.5 w-3.5 text-zinc-500 transition-transform dark:text-zinc-400', open ? '-rotate-90' : 'rotate-90')} />
        </button>

        {open && (
          <div className="absolute right-0 left-0 z-30 mt-1 overflow-hidden rounded-card border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
              <SearchInput autoFocus className="h-9" aria-label="Search services" placeholder="Search services" value={text} onChange={(event) => setText(event.target.value)} onClear={() => setText('')} />
            </div>
            <div role="listbox" aria-multiselectable="true" aria-label="Services" className="max-h-64 overflow-y-auto py-1">
              {[...groups].map(([category, services]) => (
                <div key={category} role="group" aria-label={category}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{category}</p>
                  {services.map((service) => {
                    const isChosen = chosen.has(service.slug);

                    return (
                      <button key={service.slug} type="button" role="option" aria-selected={isChosen} onClick={() => toggle(service.slug)} className={cx('flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800', isChosen && 'bg-brand-50/60 dark:bg-brand-700/10')}>
                        <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded border', isChosen ? 'border-brand-700 bg-brand-700 text-white' : 'border-zinc-300 dark:border-zinc-600')}>
                          {isChosen && <Icon name="check" className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-zinc-900 dark:text-zinc-100">{service.name}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {matches.length === 0 && <p className="px-3 py-3 text-sm text-zinc-500">No service matches “{text.trim()}”.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800">
              <span>{value.length} selected</span>
              <button type="button" className="font-medium text-brand-700 hover:underline dark:text-brand-100" onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
