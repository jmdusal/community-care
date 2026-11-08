import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { buttonClass } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/PageHead';
import { Panel } from '../../components/ui/Panel';
import { Segmented } from '../../components/ui/Segmented';
import { StatStrip } from '../../components/ui/StatStrip';
import { ApiError } from '../../lib/api';
import { scopeParams, useScope } from '../../lib/scope';
import { exportUrl, manilaDate, type UsageEvent, useReport } from './api';
import { BarList } from './components/BarList';
import { DailyColumns } from './components/DailyColumns';

type Period = '7' | '30' | '90';
type Metric = 'appointments' | UsageEvent;

const METRICS: Array<{ value: Metric; label: string; noun: string }> = [
  { value: 'appointments', label: 'Appointments', noun: 'appointments' },
  { value: 'profile_view', label: 'Profile views', noun: 'views' },
  { value: 'search', label: 'Searches', noun: 'searches' },
  { value: 'call_click', label: 'Calls', noun: 'call taps' },
  { value: 'directions_click', label: 'Directions', noun: 'direction taps' },
];

const STATUS_ROWS = [
  ['completed', 'Completed'],
  ['confirmed', 'Confirmed'],
  ['requested', 'Waiting'],
  ['no_show', 'Missed'],
  ['declined', 'Declined'],
  ['cancelled', 'Cancelled'],
] as const;

/**
 * Pilot reports: appointments and directory use over a period, per day, with the busiest
 * facilities, and CSV downloads. Aggregates only; follows the top-bar scope.
 */
export function ReportsPage() {
  const { scope } = useScope();
  const [period, setPeriod] = useState<Period>('30');
  const [metric, setMetric] = useState<Metric>('appointments');
  const range = { from: manilaDate(Number(period) - 1), to: manilaDate() };
  const params = scopeParams(scope);
  const report = useReport(range, params);
  const data = report.data;

  if (report.error instanceof ApiError && report.error.status === 403) {
    return <Alert tone="warning">Reports are for system admins, verifiers and facility admins.</Alert>;
  }

  const chosen = METRICS.find((item) => item.value === metric) ?? METRICS[0];
  const searchesHidden = data && !data.usage.searches_counted;
  const metrics = METRICS.filter((item) => !(item.value === 'search' && searchesHidden));
  const taps = data ? (data.usage.totals.call_click ?? 0) + (data.usage.totals.directions_click ?? 0) : null;

  return (
    <div className="space-y-6">
      <PageHead title="Reports" description={`Appointments and directory use${scope.name ? ` for ${scope.name}` : ' across all facilities'}. No names or contact details.`}>
        <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      </PageHead>

      {report.isPending || !data ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          <StatStrip
            items={[
              { label: 'Appointments', value: data.appointments.total.toLocaleString(), sub: `${data.appointments.by_source.guest} guest · ${data.appointments.by_source.staff} by clinic` },
              { label: 'Attendance', value: data.appointments.attendance_rate === null ? '—' : `${Math.round(data.appointments.attendance_rate * 100)}%`, sub: `${data.appointments.by_status.no_show} missed`, tone: data.appointments.attendance_rate !== null && data.appointments.attendance_rate < 0.7 ? 'warning' : 'default' },
              { label: 'Profile views', value: (data.usage.totals.profile_view ?? 0).toLocaleString(), sub: searchesHidden ? 'Searches are counted region-wide only' : `${(data.usage.totals.search ?? 0).toLocaleString()} searches` },
              { label: 'Calls & directions', value: (taps ?? 0).toLocaleString(), sub: 'Taps on the facility page' },
            ]}
          />

          <Panel
            title={`${chosen.label} per day`}
            description={`${data.range.from} to ${data.range.to} (Philippine time)`}
            action={<Segmented label="Measure" value={chosen.value} onChange={setMetric} options={metrics.map(({ value, label }) => ({ value, label }))} />}
          >
            <div className="p-4">
              <DailyColumns label={`${chosen.label} per day`} noun={chosen.noun} days={data.by_day.map((day) => ({ date: day.date, value: day[chosen.value] }))} />
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Appointment outcomes" description="By status now, for appointments in the period.">
              <div className="p-4"><BarList label="Appointments by status" rows={STATUS_ROWS.map(([key, label]) => ({ label, value: data.appointments.by_status[key] }))} /></div>
            </Panel>
            <Panel title="How appointments were made">
              <div className="p-4">
                <BarList label="Appointments by source" rows={[
                  { label: 'Patient account', value: data.appointments.by_source.online },
                  { label: 'Guest (no account)', value: data.appointments.by_source.guest },
                  { label: 'Booked by clinic', value: data.appointments.by_source.staff },
                ]} />
              </div>
            </Panel>
          </div>

          <Panel title="Busiest facilities" description="Top 10 by appointments in the period." className="overflow-hidden">
            {data.appointments.top_facilities.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No appointments in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="px-4 py-2.5 font-medium">Facility</th>
                      <th className="px-3 py-2.5 text-right font-medium">Appointments</th>
                      <th className="px-3 py-2.5 text-right font-medium">Completed</th>
                      <th className="px-3 py-2.5 text-right font-medium">Missed</th>
                      <th className="px-4 py-2.5 text-right font-medium">Declined or cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 tabular-nums dark:divide-zinc-800 dark:border-zinc-800">
                    {data.appointments.top_facilities.map((row) => (
                      <tr key={row.id}>
                        <td className="min-w-[200px] px-4 py-2.5 text-zinc-900 dark:text-zinc-100">{row.name}</td>
                        <td className="px-3 py-2.5 text-right">{row.appointments}</td>
                        <td className="px-3 py-2.5 text-right">{row.completed}</td>
                        <td className="px-3 py-2.5 text-right">{row.no_show}</td>
                        <td className="px-4 py-2.5 text-right">{row.not_held}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Download as CSV" description="Opens in Excel or Google Sheets. Same period and scope as above.">
            <div className="flex flex-wrap gap-2 p-4">
              <a className={buttonClass('secondary')} href={exportUrl('daily', range, params)}><Icon name="download" /> Daily totals</a>
              <a className={buttonClass('secondary')} href={exportUrl('facilities', range, params)}><Icon name="download" /> Per facility</a>
              <a className={buttonClass('secondary')} href={exportUrl('appointments', range, params)}><Icon name="download" /> Appointment list (no contact details)</a>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
