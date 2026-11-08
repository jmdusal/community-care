import { type FormEvent, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button, buttonClass } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Modal';
import { Panel } from '../../../components/ui/Panel';
import { Pill } from '../../../components/ui/Pill';
import { RowActions } from '../../../components/ui/RowActions';
import { Select } from '../../../components/ui/Select';
import { ApiError } from '../../../lib/api';
import { formatTime } from '../../../lib/booking';
import { useServices } from '../../../lib/catalog';
import { cx } from '../../../lib/cx';
import { CheckInModal } from './CheckInModal';
import { type QueueTicket, useAddWalkIn, useCallNext, useMoveTicket, useQueue } from '../api';

const COUNTER_KEY = 'communitycare.queue_counter';

function storedCounter(): string {
  try {
    return localStorage.getItem(COUNTER_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Minutes since a time, for "waiting 12 min". */
function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** Marks numbers given to booked patients at check-in, with their booked time. */
function BookedTag({ ticket }: { ticket: QueueTicket }) {
  if (!ticket.appointment) {
    return null;
  }

  return <span className="ml-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 align-middle text-[11px] font-medium text-brand-700 dark:bg-brand-700/20 dark:text-brand-100" title={ticket.appointment.reference_code}>Booked {formatTime(ticket.appointment.starts_at)}</span>;
}

/**
 * Today's walk-in queue at one facility: add walk-ins, call the next number to your
 * window, and move each number along. The public "Now serving" screen shows numbers only.
 */
export function QueueView({ facilityId, facilityName }: { facilityId: string; facilityName?: string }) {
  const queue = useQueue(facilityId);
  const callNext = useCallNext(facilityId);
  const move = useMoveTicket(facilityId);
  const [counter, setCounter] = useState(storedCounter);
  const [adding, setAdding] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const tickets = queue.data?.data ?? [];
  const active = tickets.filter((ticket) => ticket.status === 'called' || ticket.status === 'serving');
  const waiting = tickets.filter((ticket) => ticket.status === 'waiting');
  const finished = tickets.filter((ticket) => ticket.status === 'done' || ticket.status === 'skipped');

  if (queue.error instanceof ApiError && queue.error.status === 403) {
    return <Alert tone="warning">You can only run the queue of facilities assigned to you.</Alert>;
  }

  const saveCounter = (value: string) => {
    setCounter(value);
    try {
      localStorage.setItem(COUNTER_KEY, value);
    } catch {
      // Not remembered in private mode.
    }
  };

  const act = (ticket: QueueTicket, action: 'call' | 'serve' | 'done' | 'skip' | 'requeue') => move.mutate({ id: ticket.id, action, counter: action === 'call' ? counter || undefined : undefined });

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Walk-in queue · {facilityName ?? 'this facility'}</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Today's numbers start at 001. Everyone at this facility sees the same queue.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">
              Your window
              <input className={cx(inputClass, 'mt-1 w-32')} placeholder="e.g. Window 1" value={counter} maxLength={30} onChange={(event) => saveCounter(event.target.value)} />
            </label>
            <Button variant="brand" className="h-10 px-5" disabled={callNext.isPending || waiting.length === 0} onClick={() => callNext.mutate(counter)}>
              <Icon name="megaphone" /> Call next{waiting.length ? ` (${waiting.length} waiting)` : ''}
            </Button>
            <Button className="h-10" onClick={() => setCheckingIn(true)}><Icon name="qr" /> Check in booking</Button>
            <Button className="h-10" onClick={() => setAdding(true)}><Icon name="plus" /> Add walk-in</Button>
            <a href={`/display/${facilityId}`} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'h-10')}><Icon name="globe" /> Open display screen</a>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Now serving" description="Called numbers, newest first.">
          <div className="space-y-2 px-5 pb-5">
            {active.length === 0 && <p className="text-sm text-zinc-500">Nobody called yet. Press "Call next".</p>}
            {[...active].sort((a, b) => (b.called_at ?? '').localeCompare(a.called_at ?? '')).map((ticket) => (
              <div key={ticket.id} className="flex items-center gap-4 rounded-card border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-700/40 dark:bg-brand-700/10">
                <span className="font-mono text-3xl font-bold text-brand-700 tabular-nums dark:text-brand-100">{ticket.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{ticket.name ?? 'Walk-in'}<BookedTag ticket={ticket} /></div>
                  <div className="text-xs text-zinc-500">{ticket.status === 'serving' ? 'Being served' : 'Called'}{ticket.counter ? ` · ${ticket.counter}` : ''}{ticket.service ? ` · ${ticket.service.name}` : ''}</div>
                </div>
                {ticket.status === 'called' && <Button className="h-8 text-xs" onClick={() => act(ticket, 'serve')}>Serving</Button>}
                <Button variant="primary" className="h-8 text-xs" onClick={() => act(ticket, 'done')}>Done</Button>
                <RowActions label={`More for ${ticket.number}`} actions={[
                  { label: 'Call again', icon: 'megaphone', onClick: () => act(ticket, 'call'), hidden: ticket.status !== 'called' },
                  { label: 'Back in line', icon: 'refresh', onClick: () => act(ticket, 'requeue'), hidden: ticket.status !== 'called' },
                  { label: 'Skip (not here)', icon: 'x', tone: 'danger', onClick: () => act(ticket, 'skip'), hidden: ticket.status !== 'called' },
                  { label: 'Call', icon: 'phone', onClick: () => { window.location.href = `tel:${ticket.mobile}`; }, hidden: !ticket.mobile },
                ]} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={`Waiting (${waiting.length})`} description="In order. Call one out of turn only if needed.">
          <div className="px-5 pb-5">
            {waiting.length === 0 ? <p className="text-sm text-zinc-500">Nobody waiting.</p> : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {waiting.map((ticket) => (
                  <li key={ticket.id} className="flex items-center gap-3 py-2">
                    <span className="w-12 font-mono text-lg font-semibold text-zinc-900 tabular-nums dark:text-white">{ticket.number}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-800 dark:text-zinc-200">{ticket.name ?? 'Walk-in'}<BookedTag ticket={ticket} />{ticket.service ? <span className="text-zinc-500"> · {ticket.service.name}</span> : null}</div>
                      <div className="text-xs text-zinc-500">Waiting {minutesSince(ticket.created_at)} min · since {formatTime(ticket.created_at)}</div>
                    </div>
                    <RowActions label={`Actions for ${ticket.number}`} actions={[
                      { label: 'Call now', icon: 'megaphone', onClick: () => act(ticket, 'call') },
                      { label: 'Call', icon: 'phone', onClick: () => { window.location.href = `tel:${ticket.mobile}`; }, hidden: !ticket.mobile },
                      { label: 'Skip (left)', icon: 'x', tone: 'danger', onClick: () => act(ticket, 'skip') },
                    ]} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <button type="button" className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300" aria-expanded={showFinished} onClick={() => setShowFinished(!showFinished)}>
          Finished today ({finished.length}) <Icon name="right" className={cx('h-4 w-4 transition', showFinished ? '-rotate-90' : 'rotate-90')} />
        </button>
        {showFinished && (
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100 px-5 dark:divide-zinc-800 dark:border-zinc-800">
            {finished.map((ticket) => (
              <li key={ticket.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 font-mono text-zinc-500 tabular-nums">{ticket.number}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">{ticket.name ?? 'Walk-in'}</span>
                <Pill tone={ticket.status === 'done' ? 'emerald' : 'zinc'}>{ticket.status === 'done' ? 'Done' : 'Skipped'}</Pill>
                {ticket.status === 'skipped' && <Button className="h-7 text-xs" onClick={() => act(ticket, 'requeue')}>Back in line</Button>}
              </li>
            ))}
            {finished.length === 0 && <li className="py-3 text-sm text-zinc-500">Nothing yet.</li>}
          </ul>
        )}
      </Panel>

      {checkingIn && <CheckInModal open facilityId={facilityId} facilityName={facilityName} onClose={() => setCheckingIn(false)} />}
      <AddWalkInModal open={adding} facilityId={facilityId} onClose={() => setAdding(false)} />
    </div>
  );
}

/** Name and mobile are optional: a number alone is enough to queue. */
function AddWalkInModal({ open, facilityId, onClose }: { open: boolean; facilityId: string; onClose: () => void }) {
  const add = useAddWalkIn(facilityId);
  const services = useServices();
  const [form, setForm] = useState({ name: '', mobile: '', service: '' });
  const fieldError = (key: string) => (add.error instanceof ApiError ? add.error.field(key) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate(
      { name: form.name.trim() || undefined, mobile: form.mobile.trim() || undefined, service: form.service || undefined },
      { onSuccess: () => { setForm({ name: '', mobile: '', service: '' }); onClose(); } },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a walk-in"
      description="They get the next number. Name and mobile are optional."
      footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" form="walk-in" variant="brand" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Give next number'}</Button></>}
    >
      <form id="walk-in" onSubmit={submit} className="space-y-4">
        <Field label="Name (optional)" error={fieldError('name')}>
          <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} autoFocus autoComplete="off" />
        </Field>
        <Field label="Mobile (optional)" hint="To text or call them if they step out." error={fieldError('mobile')}>
          <input className={inputClass} type="tel" inputMode="tel" placeholder="0917 123 4567" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} autoComplete="off" />
        </Field>
        <Field label="Service (optional)">
          <Select placeholder="Any" value={form.service} options={(services.data ?? []).map((service) => ({ value: service.slug, label: service.name }))} onChange={(event) => setForm({ ...form, service: event.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}
