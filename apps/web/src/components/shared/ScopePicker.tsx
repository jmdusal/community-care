import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useFacilityOptions, useRegions } from '../../lib/catalog';
import { cx } from '../../lib/cx';
import type { Scope } from '../../lib/scope';
import { useDebouncedValue } from '../../lib/useLiveSearch';
import { Icon } from '../ui/Icon';
import { SearchInput } from '../ui/SearchInput';

/** The parts of the signed-in user the picker needs. */
export type ScopeUser = { roles: string[]; sees_all_facilities?: boolean; facilities?: Array<{ id: string; name: string }> };

type Picked = Map<string, string>;

/**
 * Chooses the scope the admin console works in (top bar).
 * - Admins and verifiers: all facilities, a region, or one or more facilities (search 2+ letters, tick several).
 * - Assigned-facility roles: all of their facilities, or tick one or several of them.
 * Ticking facilities builds a selection that applies with "Show"; the API checks access either way.
 */
export function ScopePicker({ user, scope, onChange, disabled = false, disabledReason }: {
  user: ScopeUser;
  scope: Scope;
  onChange: (scope: Scope) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Picked>(new Map());
  const root = useRef<HTMLDivElement>(null);
  const seesAll = user.sees_all_facilities ?? false;
  const query = useDebouncedValue(text.trim(), 250);
  const regions = useRegions();
  const facilities = useFacilityOptions(query, open && seesAll && query.length >= 2);
  const needle = text.trim().toLowerCase();
  const allLabel = seesAll ? 'All facilities' : 'All my facilities';

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

  const currentIds = scope.facilityIds ?? (scope.facilityId ? [scope.facilityId] : []);

  const toggleOpen = () => {
    if (!open) {
      // Start from what is shown now (names for several come from the user's list or the last label).
      const names = new Map((user.facilities ?? []).map((facility) => [facility.id, facility.name]));
      setPicked(new Map(currentIds.map((id) => [id, names.get(id) ?? (currentIds.length === 1 ? scope.name ?? 'Selected facility' : 'Selected facility')])));
    }
    setOpen(!open);
  };

  const choose = (next: Scope) => {
    onChange(next);
    setOpen(false);
    setText('');
  };

  const toggle = (id: string, name: string) => setPicked((current) => {
    const next = new Map(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.set(id, name);
    }

    return next;
  });

  const apply = () => {
    const ids = [...picked.keys()];
    if (ids.length === 0) {
      choose({ name: allLabel });

      return;
    }
    choose({ facilityIds: ids, name: ids.length === 1 ? picked.get(ids[0]) : `${ids.length} facilities` });
  };

  const changed = picked.size !== currentIds.length || currentIds.some((id) => !picked.has(id));
  const assigned = (user.facilities ?? []).filter((facility) => facility.name.toLowerCase().includes(needle));
  const regionMatches = (regions.data ?? []).filter((region) => region.name.toLowerCase().includes(needle));
  const several = (scope.facilityIds?.length ?? 0) > 1;
  const kind = scope.facilityId ? 'Facility' : several ? 'Facilities' : scope.regionCode ? 'Region' : 'Scope';
  const label = scope.name ?? (scope.facilityId || several || scope.regionCode ? 'Selected' : allLabel);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="flex h-8 w-56 sm:w-72 disabled:cursor-not-allowed disabled:opacity-50 items-center gap-2 rounded-control border border-zinc-200 bg-white px-3 text-left text-sm hover:border-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-950"
      >
        <Icon name={scope.facilityId || several ? 'building' : scope.regionCode ? 'pin' : 'globe'} className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <span className="shrink-0 text-xs text-zinc-500">{kind}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        <Icon name="right" className={cx('h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform', open ? '-rotate-90' : 'rotate-90')} />
      </button>

      {open && (
        <div role="dialog" aria-label="Choose dashboard scope" className="absolute right-0 z-30 mt-1.5 w-80 overflow-hidden rounded-card border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <SearchInput
              autoFocus
              className="h-9"
              aria-label={seesAll ? 'Search regions or facilities' : 'Search your facilities'}
              placeholder={seesAll ? 'Search region or facility…' : 'Search your facilities…'}
              value={text}
              busy={facilities.isFetching}
              onChange={(event) => setText(event.target.value)}
              onClear={() => setText('')}
            />
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {!needle && <Option icon="globe" label={allLabel} selected={currentIds.length === 0 && !scope.regionCode} onClick={() => choose({ name: allLabel })} />}

            {seesAll ? (
              <>
                {picked.size > 0 && query.length < 2 && (
                  <Group title="Ticked facilities">
                    {[...picked].map(([id, name]) => <Check key={id} label={name} checked onClick={() => toggle(id, name)} />)}
                  </Group>
                )}

                {query.length >= 2 && (
                  <Group title="Facilities (tick one or more)">
                    {(facilities.data?.data ?? []).map((facility) => (
                      <Check key={facility.id} label={facility.name} hint={facility.city ?? undefined} checked={picked.has(facility.id)} onClick={() => toggle(facility.id, facility.name)} />
                    ))}
                    {facilities.data && facilities.data.data.length === 0 && <Empty>No facility matches “{text.trim()}”.</Empty>}
                  </Group>
                )}

                <Group title="Regions">
                  {regionMatches.map((region) => (
                    <Option key={region.code} icon="pin" label={region.name} selected={scope.regionCode === region.code} onClick={() => choose({ regionCode: region.code, name: region.name })} />
                  ))}
                  {regionMatches.length === 0 && <Empty>No region matches.</Empty>}
                </Group>

                {query.length < 2 && <p className="px-3 pt-1 pb-2 text-[11px] text-zinc-500 dark:text-zinc-400">Type 2+ letters to find facilities, then tick one or more.</p>}
              </>
            ) : (
              <Group title="Your facilities (tick one or more)">
                {assigned.map((facility) => (
                  <Check key={facility.id} label={facility.name} checked={picked.has(facility.id)} onClick={() => toggle(facility.id, facility.name)} />
                ))}
                {assigned.length === 0 && <Empty>No assigned facility matches.</Empty>}
              </Group>
            )}
          </div>

          {(changed || picked.size > 0) && (
            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
              <button type="button" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white" onClick={() => setPicked(new Map())}>Clear</button>
              <button type="button" disabled={!changed} onClick={apply} className="rounded-control bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900">
                {picked.size === 0 ? `Show ${allLabel.toLowerCase()}` : `Show ${picked.size} ${picked.size === 1 ? 'facility' : 'facilities'}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 uppercase">{title}</p>
      {children}
    </div>
  );
}

function Option({ icon, label, hint, selected, onClick }: { icon: 'globe' | 'pin' | 'building'; label: string; hint?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx('flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800', selected && 'font-medium text-brand-700 dark:text-brand-100')}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
      {selected && <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" />}
    </button>
  );
}

function Check({ label, hint, checked, onClick }: { label: string; hint?: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cx('flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800', checked && 'font-medium text-brand-700 dark:text-brand-100')}
    >
      <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded border', checked ? 'border-brand-700 bg-brand-700 text-white' : 'border-zinc-300 dark:border-zinc-600')}>
        {checked && <Icon name="check" className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
    </button>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-1.5 text-xs text-zinc-500">{children}</p>;
}
