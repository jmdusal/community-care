import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { PageHead } from '../../components/ui/PageHead';
import { Panel } from '../../components/ui/Panel';
import { Segmented } from '../../components/ui/Segmented';
import { useScope } from '../../lib/scope';
import { useIsDark } from '../../lib/useIsDark';
import { useMe } from '../auth/useAuth';
import { statusColors, useStats } from './api';
import { ActivityFeed } from './components/ActivityFeed';
import { NeedsAttention } from './components/NeedsAttention';
import { OverviewStats } from './components/OverviewStats';
import { StateBar } from './components/StateBar';
import { SystemStatusCard } from './components/SystemStatusCard';
import { UsageChart } from './components/UsageChart';

type Days = '7' | '30' | '90';

/** Overview: every number comes from GET /admin/stats for the chosen scope. */
export function OverviewPage() {
  const me = useMe();
  const dark = useIsDark();
  const unassigned = !(me.data?.sees_all_facilities ?? false) && (me.data?.facilities ?? []).length === 0;
  const { scope } = useScope();
  const [days, setDays] = useState<Days>('30');

  // With nothing chosen, people at assigned facilities see all of theirs (the API decides).
  const stats = useStats(scope, Number(days), !unassigned);
  const data = stats.data;

  return (
    <div className="space-y-6">
      <PageHead title="Overview" description={data ? `${data.scope.name} · last ${data.days} days` : 'Directory health and usage'}>
        <Segmented label="Time range" value={days} onChange={setDays} options={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }]} />
      </PageHead>

      {unassigned && <Alert tone="warning">No facility is assigned to you yet. Ask a system administrator to assign one.</Alert>}

      {data && (
        <>
          <OverviewStats data={data} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title="Public directory usage" description="Anonymous daily counts">
              <div className="px-5 pb-5"><UsageChart series={data.usage.series} dark={dark} /></div>
            </Panel>
            <Panel title="Data freshness" description="Days since last verification">
              <div className="px-5 pb-5">
                <StateBar
                  label="Data freshness"
                  items={[
                    { key: 'fresh', label: 'Under 90 days', value: data.freshness.under_90, color: statusColors.good },
                    { key: 'aging', label: '90–180 days', value: data.freshness.from_90_to_180, color: statusColors.warning },
                    { key: 'old', label: 'Over 180 days', value: data.freshness.over_180, color: statusColors.critical },
                    { key: 'never', label: 'Never', value: data.freshness.never, color: statusColors.neutral },
                  ]}
                />
                <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800">“Verified” is our own review state, not a DOH license or accreditation.</p>
              </div>
            </Panel>
          </div>

          <Panel title="Verification status" description={data.scope.type === 'facility' ? 'This facility\'s record' : 'All records in this scope'}>
            <div className="px-5 pb-5">
              <StateBar
                label="Verification status"
                items={[
                  { key: 'verified', label: 'Verified', value: data.verification.verified, color: statusColors.good },
                  { key: 'pending', label: 'In review', value: data.verification.pending_review, color: statusColors.warning },
                  { key: 'stale', label: 'Stale', value: data.verification.stale, color: statusColors.critical },
                  { key: 'draft', label: 'Draft', value: data.verification.draft, color: statusColors.neutral },
                  { key: 'rejected', label: 'Rejected', value: data.verification.rejected, color: '#52525b' },
                ]}
              />
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <NeedsAttention items={data.needs_attention} />
            <ActivityFeed items={data.recent_activity} />
          </div>
        </>
      )}

      <SystemStatusCard />
    </div>
  );
}
