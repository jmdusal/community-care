import { useState } from 'react';
import { ActionsHeader, RowActions } from '../../components/ui/RowActions';
import { Alert } from '../../components/ui/Alert';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { Pill } from '../../components/ui/Pill';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segmented } from '../../components/ui/Segmented';
import { ApiError } from '../../lib/api';
import { formatSlot } from '../../lib/booking';
import { formatDay } from '../../lib/format';
import { isNarrowed, scopeParams, useScope } from '../../lib/scope';
import { useDebouncedValue } from '../../lib/useLiveSearch';
import { usePatients } from './api';
import { PatientPanel } from './components/PatientPanel';

/**
 * Patient accounts. System admins see everyone and can suspend an account; facility admins
 * and staff see patients who have appointments at their facilities. Guests and callers
 * without an account are not listed here; they appear in Appointments.
 */
export function PatientsPage() {
  const { scope } = useScope();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'suspended'>('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDebouncedValue(text, 250);
  const patients = usePatients({ q, status, page }, scopeParams(scope));
  const list = patients.data?.data ?? [];
  const canManage = patients.data?.meta.can_manage ?? false;

  if (patients.error instanceof ApiError && patients.error.status === 403) {
    return <Alert tone="warning">Patient details are limited to system admins and the staff of the facilities they visit.</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHead title="Patients" description="People with a patient account. Guests and callers without an account are listed under Appointments." />

      {isNarrowed(scope) && <Alert>Showing patients with appointments at {scope.name ?? 'the selected scope'}.</Alert>}

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <SearchInput className="sm:w-80" aria-label="Search patients" placeholder="Search by name, email or mobile" value={text} busy={patients.isFetching} onChange={(event) => { setText(event.target.value); setPage(1); }} onClear={() => setText('')} />
          <Segmented label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        </div>

        {patients.isPending ? (
          <p className="p-4 text-sm text-zinc-500">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState icon="user" title={q ? `No patient matches “${q}”` : 'No patients yet'}>Patients appear here once they create an account{canManage ? '' : ' and book at your facilities'}.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">Patient</th>
                  <th className="px-3 py-2.5 font-medium">Mobile</th>
                  <th className="px-3 py-2.5 font-medium">Appointments</th>
                  <th className="px-3 py-2.5 font-medium">Last appointment</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <ActionsHeader />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                {list.map((patient) => (
                  <tr key={patient.id}>
                    <td className="min-w-[220px] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={patient.name} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{patient.name}</div>
                          <div className="truncate text-xs text-zinc-500">{patient.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">{patient.mobile ? <a href={`tel:${patient.mobile}`} className="text-brand-700 hover:underline dark:text-brand-100">{patient.mobile}</a> : '—'}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {patient.appointments}{patient.upcoming ? <span className="text-zinc-500"> · {patient.upcoming} upcoming</span> : null}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">{patient.last_appointment_at ? formatSlot(patient.last_appointment_at) : '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{patient.status === 'suspended' ? <Pill tone="rose">Suspended</Pill> : <span className="text-xs text-zinc-500">Joined {formatDay(patient.joined_at)}</span>}</td>
                    <td className="px-4 py-3 text-right"><RowActions label={`Actions for ${patient.name}`} actions={[{ label: 'View details', icon: 'eye', onClick: () => setOpenId(patient.id) }, { label: 'Call', icon: 'phone', onClick: () => { window.location.href = `tel:${patient.mobile}`; }, hidden: !patient.mobile }, { label: 'Email', icon: 'mail', onClick: () => { window.location.href = `mailto:${patient.email}`; } }]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {patients.data && (
          <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
            <Pagination perPage={patients.data.meta.per_page} page={patients.data.meta.page} lastPage={patients.data.meta.last_page} total={patients.data.meta.total} onChange={setPage} noun="patients" />
          </div>
        )}
      </Panel>

      <PatientPanel id={openId} canManage={canManage} onClose={() => setOpenId(null)} />
    </div>
  );
}
