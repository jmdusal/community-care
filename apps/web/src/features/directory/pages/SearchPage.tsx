import { type FormEvent, lazy, Suspense, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';
import { Pagination } from '../../../components/ui/Pagination';
import { Segmented } from '../../../components/ui/Segmented';
import { cx } from '../../../lib/cx';
import { useLiveSearch } from '../../../lib/useLiveSearch';
import { useFacilitySearch, useServices } from '../api';
import { FacilityCard } from '../components/FacilityCard';
import { NearMeControl } from '../components/NearMeControl';
import { SearchFilters } from '../components/SearchFilters';
import { useSearchState } from '../useSearchState';

const ResultsMap = lazy(() => import('../components/ResultsMap'));

/** Public directory: a search hero with quick service chips, filters on the side, results as a list or map. */
export function SearchPage() {
  const [state, update] = useSearchState();
  const search = useLiveSearch(state.q, (q) => update({ q }, { replace: true }));
  const results = useFacilitySearch(state);
  const services = useServices();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const nearby = state.lat !== undefined && state.lng !== undefined;
  const popular = (services.data ?? []).filter((service) => service.facilities > 0).sort((a, b) => b.facilities - a.facilities).slice(0, 6);
  const total = results.data?.meta.total ?? 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.flush();
  };

  return (
    <div>
      <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-b from-brand-50 via-white to-zinc-50 dark:border-zinc-800 dark:from-brand-700/15 dark:via-zinc-950 dark:to-zinc-950">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl dark:bg-brand-700/20" />
        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-16">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100 dark:bg-zinc-900/60 dark:text-brand-100 dark:ring-brand-700/40">
            <Icon name="shield" className="h-3.5 w-3.5" /> Free · public sources · reviewed by our team
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">Find a health facility near you</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base dark:text-zinc-400">Health centers, barangay health stations, clinics and hospitals across the Philippines, with hours, services and where the information came from.</p>

          <form onSubmit={submit} role="search" className="mt-6 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 shadow-zinc-900/5 ring-zinc-200 sm:flex-row sm:items-center dark:bg-zinc-900 dark:ring-zinc-800">
            <label className="flex h-12 flex-1 items-center gap-3 px-3">
              <Icon name={search.pending || results.isFetching ? 'refresh' : 'search'} className={cx('h-5 w-5 shrink-0 text-zinc-400', (search.pending || results.isFetching) && 'animate-spin')} />
              <input
                type="search"
                aria-label="Facility name or address"
                placeholder="Facility name, city or address"
                value={search.text}
                onChange={(event) => search.setText(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden dark:text-white"
              />
              {search.text && <button type="button" onClick={() => search.setText('')} aria-label="Clear search" className="rounded p-1 text-zinc-400 hover:text-zinc-700"><Icon name="x" className="h-4 w-4" /></button>}
            </label>
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2 dark:border-zinc-800">
              <NearMeControl
                active={nearby}
                radius={state.radius ?? 10}
                onLocate={(lat, lng) => update({ lat, lng, radius: state.radius ?? 10 })}
                onRadius={(radius) => update({ radius })}
                onClear={() => update({ lat: undefined, lng: undefined, radius: undefined })}
              />
            </div>
          </form>

          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Popular:</span>
              {popular.map((service) => {
                const on = state.service === service.slug;

                return (
                  <button
                    key={service.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ service: on ? undefined : service.slug })}
                    className={cx('rounded-full px-3 py-1 text-xs font-medium ring-1 transition', on ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-zinc-700 ring-zinc-200 hover:ring-brand-300 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700')}
                  >
                    {service.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <button type="button" className="mb-3 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium lg:hidden dark:border-zinc-800 dark:bg-zinc-900" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
            Filters <Icon name="right" className={cx('h-4 w-4 transition', filtersOpen ? '-rotate-90' : 'rotate-90')} />
          </button>
          <div className={cx('rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900', !filtersOpen && 'hidden lg:block')}>
            <SearchFilters state={state} onChange={update} />
          </div>
        </aside>

        <section className="min-w-0 space-y-4" aria-label="Results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
              {results.data ? (
                <><strong className="font-semibold text-zinc-900 dark:text-white">{total.toLocaleString()}</strong> {total === 1 ? 'facility' : 'facilities'}{nearby ? ', nearest first' : ''}</>
              ) : 'Searching…'}
            </p>
            <Segmented label="View" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'map', label: 'Map' }]} />
          </div>

          {results.error && <Alert tone="danger">The directory could not be reached. Please try again in a moment.</Alert>}

          {results.data?.data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 dark:border-zinc-700 dark:bg-zinc-900">
              <EmptyState title="No facilities found">Try a shorter name, another region, or turn off "Verified only".</EmptyState>
            </div>
          ) : view === 'map' ? (
            <div className="h-[520px] overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <Suspense fallback={<div className="grid h-full place-items-center text-sm text-zinc-500">Loading map…</div>}>
                <ResultsMap facilities={results.data?.data ?? []} />
              </Suspense>
            </div>
          ) : (
            <div className="space-y-3">
              {results.isPending && [0, 1, 2].map((key) => <div key={key} className="h-32 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />)}
              {results.data?.data.map((facility) => <FacilityCard key={facility.id} facility={facility} />)}
            </div>
          )}

          {results.data && total > 0 && (
            <Pagination
              page={results.data.meta.page}
              lastPage={results.data.meta.last_page}
              total={total}
              perPage={results.data.meta.per_page}
              noun="facilities"
              onChange={(page) => {
                update({ page });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
