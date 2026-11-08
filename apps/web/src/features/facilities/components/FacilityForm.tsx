import { type FormEvent, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Select } from '../../../components/ui/Select';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { useFacilityTypes, useServices } from '../../../lib/catalog';
import type { FacilityValues } from '../api';
import { ContactsEditor } from './ContactsEditor';
import { HoursEditor, SpecialDaysEditor } from './HoursEditor';
import { LocationFields } from './LocationFields';
import { ServicesPicker } from './ServicesPicker';

export const emptyValues: FacilityValues = { name: '', type: null, address: null, city_code: null, barangay_code: null, latitude: null, longitude: null, contacts: [], hours: [], hour_exceptions: [], services: [] };

/**
 * The facility fields as one form. Submitting never edits the record directly:
 * it creates a change request that a second person approves.
 */
export function FacilityForm({ initial, submitLabel, pending, error, onSubmit, onCancel }: {
  initial: FacilityValues;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: FacilityValues & { note?: string }) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FacilityValues>({ ...initial, hour_exceptions: initial.hour_exceptions ?? [] });
  const [region, setRegion] = useState(initial.city_code ? `${initial.city_code.slice(0, 2)}00000000` : '');
  const [note, setNote] = useState('');
  const types = useFacilityTypes(true);
  const services = useServices(true);
  const apiError = error instanceof ApiError ? error : null;
  const fieldError = (field: string) => apiError?.field(field);
  // Errors on list rows arrive as "hours.2.closes_at": show the first one under the list.
  const firstError = (prefix: string) => Object.entries(apiError?.body.fields ?? {}).find(([key]) => key === prefix || key.startsWith(`${prefix}.`))?.[1]?.[0];
  const set = (patch: Partial<FacilityValues>) => setValues((current) => ({ ...current, ...patch }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ ...values, contacts: values.contacts.filter((contact) => contact.value.trim() !== ''), note: note || undefined });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Name" error={fieldError('name')}>
        <input required className={inputClass} value={values.name ?? ''} onChange={(event) => set({ name: event.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Facility type" error={fieldError('type')}>
          <Select placeholder="Not set" value={values.type ?? ''} options={(types.data ?? []).filter((type) => !type.archived || type.slug === values.type).map((type) => ({ value: type.slug, label: type.archived ? `${type.name} (archived)` : type.name }))} onChange={(event) => set({ type: event.target.value || null })} />
        </Field>
        <Field label="Street address" error={fieldError('address')}>
          <input className={inputClass} value={values.address ?? ''} onChange={(event) => set({ address: event.target.value || null })} />
        </Field>
      </div>

      <LocationFields value={values} region={region} onRegion={setRegion} onChange={set} errors={fieldError} />

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Public contacts</legend>
        <ContactsEditor value={values.contacts} onChange={(contacts) => set({ contacts })} />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Opening hours</legend>
        <HoursEditor value={values.hours} onChange={(hours) => set({ hours })} />
        {firstError('hours') && <p className="text-xs text-rose-700 dark:text-rose-400">{firstError('hours')}</p>}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Special days (holidays, closures)</legend>
        <SpecialDaysEditor value={values.hour_exceptions} onChange={(hour_exceptions) => set({ hour_exceptions })} error={firstError('hour_exceptions')} />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Listed services</legend>
        <ServicesPicker catalog={services.data ?? []} value={values.services} onChange={(list) => set({ services: list })} />
      </fieldset>

      <Field label="Note for the reviewer" hint="Where did this information come from?">
        <textarea rows={2} className={cx(inputClass, 'h-auto py-2')} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>

      {apiError && <Alert tone="danger">{apiError.field('changes') ?? apiError.body.message}</Alert>}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="brand" disabled={pending}>{pending ? 'Submitting…' : submitLabel}</Button>
      </div>
    </form>
  );
}
