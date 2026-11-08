import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { ApiError } from '../../lib/api';
import type { Appointment } from '../../lib/booking';
import { scopeParams, useScope } from '../../lib/scope';
import { useLiveSearch } from '../../lib/useLiveSearch';
import { type StaffAction, useAppointmentAction, useStaffAppointments, type View } from './api';
import { AppointmentCalendar } from './components/AppointmentCalendar';
import { AppointmentPanel } from './components/AppointmentPanel';
import { AppointmentTable } from './components/AppointmentTable';
import { BookForPatientModal } from './components/BookForPatientModal';
import { ReasonModal } from './components/ReasonModal';
import { QueueView } from './components/QueueView';
import { ScheduleView } from './components/ScheduleView';
import { useWorkingFacility } from './useWorkingFacility';

type Tab = View | 'calendar' | 'schedule' | 'queue';

/** Booking pilot for staff: requests to confirm, upcoming and past appointments, and the facility schedule. */
export function AppointmentsPage() {
  const { scope } = useScope();
  const [tab, setTab] = useState<Tab>('requests');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState<string | undefined>();
  const [pending, setPending] = useState<{ appointment: Appointment; action: StaffAction } | null>(null);
  const [booking, setBooking] = useState(false);
  const working = useWorkingFacility(scope);
  // Calendar: the open appointment, or the open day's list.
  const [opened, setOpened] = useState<Appointment | null>(null);
  const [openDay, setOpenDay] = useState<{ date: string; items: Appointment[] } | null>(null);
  const runFromPanel = (appointment: Appointment, action: StaffAction, needsReason: boolean) => {
    if (needsReason) {
      setPending({ appointment, action });

      return;
    }
    act.mutate({ id: appointment.id, action }, { onSuccess: (updated) => setOpened(updated) });
  };
  const search = useLiveSearch(q, (value) => { setQ(value); setPage(1); });
  const view: View = tab === 'schedule' || tab === 'queue' || tab === 'calendar' ? 'requests' : tab;
  const list = useStaffAppointments({ view, page, q, scope: scopeParams(scope) });
  const act = useAppointmentAction();
  const counts = list.data?.meta.counts;

  if (list.error instanceof ApiError && list.error.status === 403) {
    return <Alert tone="warning">Appointments are handled by facility staff and system administrators. Verifiers don't see patient details.</Alert>;
  }

  const run = (appointment: Appointment, action: StaffAction, needsReason: boolean) => {
    if (needsReason) {
      setPending({ appointment, action });

      return;
    }
    act.mutate({ id: appointment.id, action });
  };

  return (
    <div className="space-y-5">
      <PageHead title="Appointments" description="Pilot: requests need a clinic confirmation. Patients are emailed when you confirm, decline or cancel.">
        <Button variant="primary" disabled={!working.facility} onClick={() => setBooking(true)}>
          <Icon name="plus" /> Book for a patient
        </Button>
      </PageHead>

      <Tabs
        label="Appointment views"
        value={tab}
        onChange={(value) => { setTab(value); setPage(1); }}
        items={[
          { value: 'requests', label: 'Requests', count: counts?.requests },
          { value: 'upcoming', label: 'Upcoming', count: counts?.upcoming },
          { value: 'past', label: 'Past', count: counts?.past },
          { value: 'calendar', label: 'Calendar' },
          { value: 'queue', label: 'Walk-in queue' },
          { value: 'schedule', label: 'Schedule' },
        ]}
      />

      {act.error instanceof ApiError && <Alert tone="danger">{act.error.body.message}</Alert>}

      {(tab === 'queue' || tab === 'schedule') && working.needsChoice && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{tab === 'queue' ? 'Run the queue of' : 'Manage the times of'}</span>
          <Select
            aria-label="Facility"
            className="w-auto min-w-64"
            value={working.facility?.id ?? ''}
            options={working.options.map((facility) => ({ value: facility.id, label: facility.name }))}
            onChange={(event) => working.choose(event.target.value)}
          />
          <span className="text-xs text-zinc-500">One facility at a time. The top bar decides which facilities are listed.</span>
        </div>
      )}

      {tab === 'calendar' ? (
        <AppointmentCalendar scope={scopeParams(scope)} onOpen={(appointment) => { setOpenDay(null); setOpened(appointment); }} onOpenDay={(date, items) => { setOpened(null); setOpenDay({ date, items }); }} />
      ) : tab === 'queue' || tab === 'schedule' ? (
        working.facility ? (
          tab === 'queue'
            ? <QueueView key={`queue-${working.facility.id}`} facilityId={working.facility.id} facilityName={working.facility.name} />
            : <ScheduleView key={`schedule-${working.facility.id}`} facilityId={working.facility.id} facilityName={working.facility.name} />
        ) : working.loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <Alert>No facility in your current selection. Change it with the picker in the top bar.</Alert>
        )
      ) : (
        <Panel>
          <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
            <SearchInput className="h-9 sm:w-80" aria-label="Search by reference or patient" placeholder="Search by reference, name, mobile or email" value={search.text} busy={search.pending || list.isFetching} onChange={(event) => search.setText(event.target.value)} onClear={() => search.setText('')} />
          </div>
          {list.data && list.data.data.length > 0 ? (
            <>
              <AppointmentTable appointments={list.data.data} onAction={run} busyId={act.isPending ? (act.variables?.id ?? null) : null} />
              {(
                <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <Pagination perPage={list.data.meta.per_page} page={page} lastPage={list.data.meta.last_page} total={list.data.meta.total} onChange={setPage} noun="appointments" />
                </div>
              )}
            </>
          ) : (
            <div className="p-5">
              <EmptyState icon="calendar" title={list.isPending ? 'Loading…' : tab === 'requests' ? 'No requests waiting' : 'Nothing here'}>
                {!list.isPending && tab === 'requests' && 'New requests appear here, and staff of the facility get an email.'}
              </EmptyState>
            </div>
          )}
        </Panel>
      )}

      {working.facility && <BookForPatientModal key={`book-${working.facility.id}`} open={booking} facilityId={working.facility.id} facilityName={working.facility.name} facilities={working.options} onClose={() => setBooking(false)} />}

      <AppointmentPanel
        appointment={opened}
        day={openDay}
        busy={act.isPending}
        onAction={runFromPanel}
        onPick={setOpened}
        onClose={() => { setOpened(null); setOpenDay(null); }}
      />

      <ReasonModal
        open={pending !== null}
        title={pending?.action === 'decline' ? 'Decline request' : 'Cancel appointment'}
        pending={act.isPending}
        onClose={() => setPending(null)}
        onSubmit={(reason) => pending && act.mutate({ id: pending.appointment.id, action: pending.action, reason }, { onSuccess: (updated) => { setPending(null); if (opened) { setOpened(updated); } } })}
      />
    </div>
  );
}
