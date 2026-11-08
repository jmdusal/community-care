import { Select } from '../../../components/ui/Select';
import { Toggle } from '../../../components/ui/Toggle';
import { type SearchParams, useCities, useFacilityTypes, useRegions, useServices } from '../api';

/** Region → city, facility type, service and "verified only", stacked for the sidebar. */
export function SearchFilters({ state, onChange }: { state: SearchParams; onChange: (changes: Partial<SearchParams>) => void }) {
  const regions = useRegions();
  const cities = useCities(state.region);
  const types = useFacilityTypes();
  const services = useServices();
  const active = Boolean(state.region || state.city || state.type || state.service || state.verified);
  const label = 'mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Filters</h2>
        {active && (
          <button type="button" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-100" onClick={() => onChange({ region: undefined, city: undefined, type: undefined, service: undefined, verified: false })}>
            Clear all
          </button>
        )}
      </div>
      <div>
        <span className={label}>Region</span>
        <Select aria-label="Region" placeholder="All regions" value={state.region ?? ''} options={(regions.data ?? []).map((region) => ({ value: region.code, label: region.name }))} onChange={(event) => onChange({ region: event.target.value || undefined, city: undefined })} />
      </div>
      <div>
        <span className={label}>City or municipality</span>
        <Select aria-label="City or municipality" placeholder={state.region ? 'All cities and municipalities' : 'Choose a region first'} disabled={!state.region} value={state.city ?? ''} options={(cities.data ?? []).map((city) => ({ value: city.code, label: city.name }))} onChange={(event) => onChange({ city: event.target.value || undefined })} />
      </div>
      <div>
        <span className={label}>Facility type</span>
        <Select aria-label="Facility type" placeholder="All facility types" value={state.type ?? ''} options={(types.data ?? []).filter((type) => type.facilities > 0).map((type) => ({ value: type.slug, label: type.name }))} onChange={(event) => onChange({ type: event.target.value || undefined })} />
      </div>
      <div>
        <span className={label}>Service</span>
        <Select aria-label="Service" placeholder="All services" value={state.service ?? ''} options={(services.data ?? []).filter((service) => service.facilities > 0).map((service) => ({ value: service.slug, label: service.name }))} onChange={(event) => onChange({ service: event.target.value || undefined })} />
      </div>
      <label className="flex items-start gap-2.5 border-t border-zinc-100 pt-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
        <Toggle label="Verified only" checked={state.verified ?? false} onChange={(verified) => onChange({ verified })} />
        <span>Verified only<span className="block text-xs text-zinc-500">Checked by our review team</span></span>
      </label>
    </div>
  );
}
