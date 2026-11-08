import { type FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { ApiError } from '../../../lib/api';
import { useServices } from '../../../lib/catalog';
import { cx } from '../../../lib/cx';
import { type SlotInput, useGenerateSlots } from '../api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

/** Publishes appointment times: weekdays × date range × time window, split into slots with a seat limit. */
export function AddSlotsModal({ open, facilityId, onClose }: { open: boolean; facilityId: string; onClose: () => void }) {
  const generate = useGenerateSlots(facilityId);
  const services = useServices();
  const [form, setForm] = useState<SlotInput>({ from_date: today(), to_date: inDays(13), weekdays: [1, 2, 3, 4, 5], start_time: '08:00', end_time: '12:00', slot_minutes: 30, capacity: 4, service: null });
  const error = generate.error instanceof ApiError ? generate.error : null;

  useEffect(() => generate.reset(), [open]);

  const perDay = Math.max(0, Math.floor((minutes(form.end_time) - minutes(form.start_time)) / form.slot_minutes));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    generate.mutate(form, { onSuccess: onClose });
  };

  const toggleDay = (day: number) => setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((d) => d !== day) : [...current.weekdays, day].sort() }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Add appointment times"
      description="Times are in Philippine time. Existing times are kept; nothing is double-created."
      footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" form="slots-form" variant="primary" disabled={generate.isPending || form.weekdays.length === 0 || perDay === 0}>{generate.isPending ? 'Adding…' : 'Add times'}</Button></>}
    >
      <form id="slots-form" onSubmit={submit} className="space-y-4">
        {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" error={error?.field('from_date')}><input type="date" required className={inputClass} value={form.from_date} min={today()} onChange={(event) => setForm({ ...form, from_date: event.target.value })} /></Field>
          <Field label="Until (max 90 days ahead)" error={error?.field('to_date')}><input type="date" required className={inputClass} value={form.to_date} min={form.from_date} onChange={(event) => setForm({ ...form, to_date: event.target.value })} /></Field>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Days</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, day) => (
              <button key={label} type="button" aria-pressed={form.weekdays.includes(day)} onClick={() => toggleDay(day)} className={cx('h-8 w-12 rounded-control border text-xs font-medium', form.weekdays.includes(day) ? 'border-brand-700 bg-brand-700 text-white' : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300')}>{label}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Start" error={error?.field('start_time')}><input type="time" required className={inputClass} value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></Field>
          <Field label="End" error={error?.field('end_time')}><input type="time" required className={inputClass} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></Field>
          <Field label="Each slot">
            <Select value={String(form.slot_minutes)} onChange={(event) => setForm({ ...form, slot_minutes: Number(event.target.value) })} options={[15, 20, 30, 45, 60, 90, 120].map((value) => ({ value: String(value), label: `${value} min` }))} />
          </Field>
          <Field label="People per slot" error={error?.field('capacity')}><input type="number" min={1} max={200} required className={inputClass} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></Field>
        </div>
        <Field label="Service (optional)" hint="Leave as general if any listed service can be booked.">
          <Select placeholder="General consultation" value={form.service ?? ''} options={(services.data ?? []).map((service) => ({ value: service.slug, label: service.name }))} onChange={(event) => setForm({ ...form, service: event.target.value || null })} />
        </Field>
        <p className="text-xs text-zinc-500">{perDay} slot{perDay === 1 ? '' : 's'} per chosen day, {form.capacity} {form.capacity === 1 ? 'person' : 'people'} each.</p>
      </form>
    </Modal>
  );
}

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);

  return (h ?? 0) * 60 + (m ?? 0);
}
