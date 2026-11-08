import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Segmented } from '../../../components/ui/Segmented';
import { cx } from '../../../lib/cx';
import { clockTime, type TodayStatus, useSaveToday, useTodayStatus } from '../../../lib/today';

type Doctor = '' | 'in' | 'out';
type Opening = '' | 'open' | 'closing_early' | 'closed';

/**
 * "Today at this facility" for staff: doctor in or out, open / closing early / closed,
 * out-of-stock items and a short note. Shows on the public page today only.
 */
export function TodayEditor({ facilityId }: { facilityId: string }) {
  const today = useTodayStatus(facilityId);

  if (today.isPending) {
    return null;
  }

  return <TodayForm key={today.data?.updated_at ?? 'none'} facilityId={facilityId} current={today.data ?? null} />;
}

function TodayForm({ facilityId, current }: { facilityId: string; current: TodayStatus | null }) {
  const save = useSaveToday(facilityId);
  const [doctor, setDoctor] = useState<Doctor>(current?.doctor ?? '');
  const [opening, setOpening] = useState<Opening>(current?.opening ?? '');
  const [closesAt, setClosesAt] = useState(current?.closes_at ?? '15:00');
  const [items, setItems] = useState<string[]>(current?.out_of_stock ?? []);
  const [item, setItem] = useState('');
  const [note, setNote] = useState(current?.note ?? '');

  const addItem = () => {
    const value = item.trim();
    if (value.length >= 2 && !items.includes(value) && items.length < 12) {
      setItems([...items, value]);
    }
    setItem('');
  };

  const onItemKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addItem();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ doctor: doctor || null, opening: opening || null, closes_at: opening === 'closing_early' ? closesAt : null, out_of_stock: items, note: note.trim() || null });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card border border-brand-100 bg-brand-50/40 p-4 dark:border-brand-700/40 dark:bg-brand-700/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Today at this facility</h3>
        <span className="text-[11px] text-zinc-500">{current?.updated_at ? `Updated ${clockTime(current.updated_at)}${current.updated_by ? ` by ${current.updated_by}` : ''}` : 'Not posted today'}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[110px_1fr] sm:items-center">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Doctor</span>
        <Segmented label="Doctor" value={doctor} onChange={setDoctor} options={[{ value: '', label: 'Not set' }, { value: 'in', label: 'In today' }, { value: 'out', label: 'Not in' }]} />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Opening</span>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Opening" value={opening} onChange={setOpening} options={[{ value: '', label: 'Not set' }, { value: 'open', label: 'Open' }, { value: 'closing_early', label: 'Closing early' }, { value: 'closed', label: 'Closed' }]} />
          {opening === 'closing_early' && <input type="time" aria-label="Closes at" className={cx(inputClass, 'w-32')} value={closesAt} onChange={(event) => setClosesAt(event.target.value)} required />}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Out of stock</span>
        {items.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((name) => (
              <li key={name} className="inline-flex items-center gap-1 rounded-full bg-amber-100 py-0.5 pr-1 pl-2.5 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                {name}
                <button type="button" aria-label={`Remove ${name}`} className="rounded-full p-0.5 hover:bg-amber-200" onClick={() => setItems(items.filter((value) => value !== name))}><Icon name="x" className="h-3 w-3" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input className={inputClass} placeholder="e.g. BCG vaccine, then Enter" value={item} maxLength={60} onChange={(event) => setItem(event.target.value)} onKeyDown={onItemKey} />
          <Button onClick={addItem} disabled={item.trim().length < 2}>Add</Button>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Note for the public (optional)</span>
        <input className={inputClass} placeholder="e.g. Bring your baby book for vaccinations" value={note} maxLength={160} onChange={(event) => setNote(event.target.value)} />
      </label>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500">Clears itself tomorrow.</span>
        <Button type="submit" variant="brand" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Post for today'}</Button>
      </div>
    </form>
  );
}
