import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Panel } from '../../../components/ui/Panel';
import { ApiError } from '../../../lib/api';
import { type BookingRules, useSaveBookingRules } from '../api';

const FIELDS = [
  { key: 'max_active', label: 'Requests one person can hold', unit: 'at a time', min: 1, max: 10 },
  { key: 'min_notice_hours', label: 'Minimum notice', unit: 'hours before', min: 0, max: 168 },
  { key: 'cancel_cutoff_hours', label: 'Online cancelling closes', unit: 'hours before', min: 0, max: 72 },
] as const;

/**
 * This facility's booking rules. Leave a box empty to use the system default (shown as the
 * placeholder). Closed special days (Facilities → Opening hours) block booking automatically.
 */
export function BookingRulesPanel({ facilityId, rules, canEdit }: { facilityId: string; rules: BookingRules; canEdit: boolean }) {
  const save = useSaveBookingRules(facilityId);
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map((field) => [field.key, rules[field.key] === null ? '' : String(rules[field.key])])) as Record<(typeof FIELDS)[number]['key'], string>);
  const fieldError = (key: string) => (save.error instanceof ApiError ? save.error.field(key) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parse = (value: string) => (value.trim() === '' ? null : Number(value));
    save.mutate({ max_active: parse(values.max_active), min_notice_hours: parse(values.min_notice_hours), cancel_cutoff_hours: parse(values.cancel_cutoff_hours) });
  };

  return (
    <Panel title="Booking rules" description="Leave a box empty to use the system default. Closed special days (set under Opening hours) block booking automatically.">
      <form onSubmit={submit} className="space-y-4 px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {FIELDS.map((field) => (
            <Field key={field.key} label={field.label} hint={`${field.unit} · now ${rules.effective[field.key]}${rules[field.key] === null ? ' (default)' : ''}`} error={fieldError(field.key)}>
              <input
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                disabled={!canEdit}
                className={inputClass}
                placeholder={`Default: ${rules.defaults[field.key]}`}
                value={values[field.key]}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              />
            </Field>
          ))}
        </div>
        {canEdit ? (
          <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save rules'}</Button>
        ) : (
          <p className="text-xs text-zinc-500">Your facility admin or a system admin can change these.</p>
        )}
      </form>
    </Panel>
  );
}
