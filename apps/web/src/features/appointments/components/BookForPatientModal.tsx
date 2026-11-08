import { type FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { ApiError } from '../../../lib/api';
import { type Appointment, formatSlot, newIdempotencyKey } from '../../../lib/booking';
import { useSchedule, useStaffBooking } from '../api';

/**
 * Book a walk-in or phone caller into one of this facility's open times. It is confirmed at
 * once. If the email belongs to a patient account, the appointment also shows in their
 * "My appointments"; either way they are emailed when an email is given.
 */
export function BookForPatientModal({ open, facilityId: initialFacilityId, facilityName: initialName, facilities = [], onClose }: {
  open: boolean;
  facilityId: string;
  facilityName?: string;
  /** When the top bar covers several facilities: choose which one to book at. */
  facilities?: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [facilityId, setFacilityId] = useState(initialFacilityId);
  const facilityName = facilities.find((item) => item.id === facilityId)?.name ?? initialName;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const schedule = useSchedule(open ? facilityId : undefined, today);
  const book = useStaffBooking(facilityId);
  const [slotId, setSlotId] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [key, setKey] = useState(newIdempotencyKey);
  const [done, setDone] = useState<Appointment | null>(null);

  useEffect(() => {
    if (open) {
      setSlotId('');
      setName('');
      setMobile('');
      setEmail('');
      setKey(newIdempotencyKey());
      setDone(null);
      setFacilityId(initialFacilityId);
      book.reset();
    }
    // Start fresh each time the form opens.
  }, [open]);

  const slots = (schedule.data?.data ?? []).filter((slot) => slot.seats_left > 0 && new Date(slot.starts_at).getTime() > Date.now());
  const fieldError = (field: string) => (book.error instanceof ApiError ? book.error.field(field) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    book.mutate(
      { input: { slot_id: slotId, name: name.trim(), mobile: mobile.trim() || undefined, email: email.trim() || undefined }, idempotencyKey: key },
      { onSuccess: setDone },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book for a patient"
      description={`A walk-in or phone caller at ${facilityName ?? 'this facility'}. Confirmed at once.`}
      footer={done ? <Button variant="primary" onClick={onClose}>Done</Button> : (
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="book-for-patient" variant="brand" disabled={book.isPending || !slotId}>{book.isPending ? 'Booking…' : 'Book appointment'}</Button>
        </>
      )}
    >
      {done ? (
        <div className="space-y-2">
          <Alert>Booked {done.patient?.name} for <strong>{formatSlot(done.starts_at)}</strong>. Reference <span className="font-mono font-semibold">{done.reference_code}</span>.</Alert>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {done.patient?.email ? 'We emailed the confirmation.' : 'Give the patient the reference code; they did not leave an email.'}
            {done.patient?.account_id ? ' It also shows in their account.' : ''}
          </p>
        </div>
      ) : (
        <form id="book-for-patient" onSubmit={submit} className="space-y-4">
          {book.error instanceof ApiError && !fieldError('name') && !fieldError('mobile') && !fieldError('email') && <Alert tone="danger">{book.error.body.message}</Alert>}
          {facilities.length > 1 && (
            <Field label="Facility">
              <Select value={facilityId} options={facilities.map((item) => ({ value: item.id, label: item.name }))} onChange={(event) => { setFacilityId(event.target.value); setSlotId(''); }} />
            </Field>
          )}
          <Field label="Time" hint={slots.length === 0 && !schedule.isPending ? 'No open times in the next two weeks. Add times in the Schedule tab.' : undefined} error={fieldError('slot_id')}>
            <Select
              required
              value={slotId}
              onChange={(event) => setSlotId(event.target.value)}
              placeholder={schedule.isPending ? 'Loading times…' : 'Choose a time'}
              options={slots.map((slot) => ({ value: slot.id, label: `${formatSlot(slot.starts_at)} · ${slot.service?.name ?? 'General'} · ${slot.seats_left} left` }))}
            />
          </Field>
          <Field label="Patient name" error={fieldError('name')}>
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile" hint="So the clinic can call them." error={fieldError('mobile')}>
              <input className={inputClass} type="tel" inputMode="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="0917 123 4567" autoComplete="off" />
            </Field>
            <Field label="Email (optional)" hint="Sends a confirmation and a reminder." error={fieldError('email')}>
              <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
            </Field>
          </div>
        </form>
      )}
    </Modal>
  );
}
