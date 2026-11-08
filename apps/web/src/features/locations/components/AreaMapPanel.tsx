import { lazy, type ReactNode, Suspense } from 'react';
import { Panel } from '../../../components/ui/Panel';
import { type MapLevel, useAreaMap } from '../api';
import { MARKER_LEGEND } from './mapLegend';

// Leaflet (~150 KB) is only downloaded when a map is shown.
const AreaMap = lazy(() => import('./AreaMap'));

/** Map panel for the selected area, with a legend and notes about approximate positions. */
export function AreaMapPanel({ level, code, name }: { level: MapLevel; code: string; name: string }) {
  const map = useAreaMap(level, code);
  const data = map.data;
  const withMap = data?.map ? { ...data, map: data.map } : null;
  const missing = data ? data.facilities.length : 0;

  return (
    <Panel
      title={`Map · ${name}`}
      description={data?.map?.approximate ? 'This area is not on OpenStreetMap yet, so its parent area is shown (no pin).' : 'The pin marks the area on OpenStreetMap; click it for coordinates. Dots are facilities.'}
    >
      <div className="px-5 pb-5">
        <div className="relative h-[420px] overflow-hidden rounded-control border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {map.isPending && <Placeholder>Finding {name} on the map… (the first look-up takes a second)</Placeholder>}
          {map.error && <Placeholder>The map could not be loaded. Try again later.</Placeholder>}
          {data && !data.map && <Placeholder>{name} could not be found on OpenStreetMap.</Placeholder>}
          {withMap && (
            <Suspense fallback={<Placeholder>Loading map…</Placeholder>}>
              <AreaMap data={withMap} />
            </Suspense>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          {withMap && !withMap.map.approximate && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="10" height="13" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 1C7.3 1 1 7.1 1 14.7 1 25 15 39 15 39s14-14 14-24.3C29 7.1 22.7 1 15 1z" fill="#0d9488" /></svg>
              {name}
            </span>
          )}
          {MARKER_LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
          <span className="ml-auto text-zinc-500">{data ? `${missing.toLocaleString()} ${missing === 1 ? 'facility' : 'facilities'} on the map` : ''}</span>
        </div>
      </div>
    </Panel>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-500">{children}</div>;
}
