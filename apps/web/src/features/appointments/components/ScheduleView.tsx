import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';
import { Panel } from '../../../components/ui/Panel';
import { Toggle } from '../../../components/ui/Toggle';
import { ApiError } from '../../../lib/api';
import { formatTime, groupByDay } from '../../../lib/booking';
import { cx } from '../../../lib/cx';
import { useBookingSwitch, useRemoveSlot, useSchedule } from '../api';
import { AddSlotsModal } from './AddSlotsModal';
import { BookingRulesPanel } from './BookingRulesPanel';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

/** One facility's next 14 days of appointment times, the pilot switch, and "Add times". */
export function ScheduleView({ facilityId, facilityName }: { facilityId: string; facilityName?: string }) {
  const schedule = useSchedule(facilityId, today());
  const remove = useRemoveSlot();
  const bookingSwitch = useBookingSwitch(facilityId);
  const [adding, setAdding] = useState(false);
  const meta = schedule.data?.meta;
  const days = groupByDay(schedule.data?.data ?? []);

  if (schedule.error instanceof ApiError && schedule.error.status === 403) {
    return <Alert tone="warning">You can only manage the schedule of facilities assigned to you.</Alert>;
  }

  return (
    <div className="space-y-4">
      {meta && (
        <Panel title={`Online booking · ${meta.facility.name ?? facilityName}`} description="People can request the times below only when both switches are on.">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 pb-5 text-sm">
            <span className="flex items-center gap-2">
              <span className={cx('h-2 w-2 rounded-full', meta.booking_feature_enabled ? 'bg-emerald-500' : 'bg-zinc-400')} />
              Booking pilot (Settings): <strong>{meta.booking_feature_enabled ? 'On' : 'Off'}</strong>
            </span>
            <span className="flex items-center gap-2">
              {meta.can_enable_booking ? (
                <>
                  <Toggle label="This facility accepts requests" checked={meta.facility.booking_enabled} disabled={bookingSwitch.isPending} onChange={(value) => bookingSwitch.mutate(value)} />
                  This facility accepts requests: <strong>{meta.facility.booking_enabled ? 'Yes' : 'No'}</strong>
                </>
              ) : (
                <>This facility: <strong>{meta.facility.booking_enabled ? 'taking part' : 'not taking part'}</strong> <span className="text-xs text-zinc-500">(a system admin switches this)</span></>
              )}
            </span>
            {!meta.facility.published && <span className="text-xs text-amber-700 dark:text-amber-400">The facility is not published, so the public can't see it.</span>}
            <Button variant="primary" className="ml-auto" onClick={() => setAdding(true)}><Icon name="calendar" /> Add times</Button>
          </div>
        </Panel>
      )}

      {meta && <BookingRulesPanel key={JSON.stringify(meta.rules)} facilityId={facilityId} rules={meta.rules} canEdit={meta.can_enable_booking} />}

      {remove.error instanceof ApiError && <Alert tone="danger">{remove.error.body.message}</Alert>}

      <Panel title="Next 14 days" description="Seats taken / available. Remove a time only when nobody has booked it.">
        <div className="px-5 pb-5">
          {schedule.isPending ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : days.length === 0 ? (
            <EmptyState icon="calendar" title="No times yet" action={<Button variant="primary" onClick={() => setAdding(true)}>Add times</Button>}>Publish the times this facility can take appointments.</EmptyState>
          ) : (
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day.day}>
                  <h3 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">{day.label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {day.items.map((slot) => {
                      const full = (slot.booked ?? 0) >= (slot.capacity ?? 0);

                      return (
                        <span key={slot.id} className={cx('group inline-flex items-center gap-2 rounded-control border px-2.5 py-1.5 text-xs', full ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-zinc-200 dark:border-zinc-700')}>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatTime(slot.starts_at)}</span>
                          <span className="text-zinc-500 tabular-nums">{slot.booked}/{slot.capacity}</span>
                          {slot.service && <span className="text-zinc-500">· {slot.service.name}</span>}
                          {(slot.booked ?? 0) === 0 && (
                            <button type="button" aria-label={`Remove ${formatTime(slot.starts_at)}`} title="Remove this time" className="text-zinc-500 dark:text-zinc-400 hover:text-rose-600" onClick={() => remove.mutate(slot.id)}>
                              <Icon name="x" className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <AddSlotsModal open={adding} facilityId={facilityId} onClose={() => setAdding(false)} />
    </div>
  );
}
