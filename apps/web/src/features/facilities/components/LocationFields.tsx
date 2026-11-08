import { Field, inputClass } from '../../../components/ui/Field';
import { Select } from '../../../components/ui/Select';
import { useBarangays, useCities, useRegions } from '../../../lib/catalog';
import type { FacilityValues } from '../api';

type Location = Pick<FacilityValues, 'city_code' | 'barangay_code' | 'latitude' | 'longitude'>;

/** Region → city → barangay pickers (PSGC) plus coordinates. */
export function LocationFields({ value, region, onRegion, onChange, errors }: {
  value: Location;
  region: string;
  onRegion: (code: string) => void;
  onChange: (patch: Partial<Location>) => void;
  errors: (field: string) => string | undefined;
}) {
  const regions = useRegions();
  const cities = useCities(region || undefined);
  const barangays = useBarangays(value.city_code ?? undefined);
  const number = (raw: string) => (raw === '' ? null : Number(raw));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Region">
          <Select placeholder="Choose…" value={region} options={(regions.data ?? []).map((item) => ({ value: item.code, label: item.name }))} onChange={(event) => { onRegion(event.target.value); onChange({ city_code: null, barangay_code: null }); }} />
        </Field>
        <Field label="City / municipality" error={errors('city_code')}>
          <Select placeholder="Choose…" disabled={!region} value={value.city_code ?? ''} options={(cities.data ?? []).map((item) => ({ value: item.code, label: item.name }))} onChange={(event) => onChange({ city_code: event.target.value || null, barangay_code: null })} />
        </Field>
        <Field label="Barangay" error={errors('barangay_code')}>
          <Select placeholder="Choose…" disabled={!value.city_code} value={value.barangay_code ?? ''} options={(barangays.data ?? []).map((item) => ({ value: item.code, label: item.name }))} onChange={(event) => onChange({ barangay_code: event.target.value || null })} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Latitude" error={errors('latitude')}>
          <input type="number" step="0.000001" className={inputClass} value={value.latitude ?? ''} onChange={(event) => onChange({ latitude: number(event.target.value) })} />
        </Field>
        <Field label="Longitude" error={errors('longitude')}>
          <input type="number" step="0.000001" className={inputClass} value={value.longitude ?? ''} onChange={(event) => onChange({ longitude: number(event.target.value) })} />
        </Field>
      </div>
    </div>
  );
}
