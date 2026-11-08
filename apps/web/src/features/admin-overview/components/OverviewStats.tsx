import { type Stat, StatStrip } from '../../../components/ui/StatStrip';
import type { DashboardStats } from '../api';

const STATUS_LABELS: Record<keyof DashboardStats['verification'], string> = {
  verified: 'Verified',
  pending_review: 'In review',
  stale: 'Stale',
  draft: 'Draft',
  rejected: 'Rejected',
};

/** Headline numbers. One facility gets facility-level cards; a region or everything gets directory-level ones. */
export function OverviewStats({ data }: { data: DashboardStats }) {
  const usage = data.usage;
  const pending: Stat = { label: 'Waiting for review', value: data.totals.pending_changes, sub: 'change requests', tone: data.totals.pending_changes ? 'warning' : 'default' };

  if (data.scope.type === 'facility') {
    const status = (Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).find((key) => data.verification[key] > 0);

    return (
      <StatStrip
        items={[
          { label: 'Record status', value: status ? STATUS_LABELS[status] : '—', sub: data.totals.published ? 'Published in the directory' : 'Not published', tone: status === 'stale' ? 'danger' : 'default' },
          { label: 'Profile views', value: usage.profile_views.toLocaleString(), sub: `last ${data.days} days` },
          { label: 'Calls & directions', value: (usage.call_clicks + usage.directions_clicks).toLocaleString(), sub: `${usage.call_clicks} calls · ${usage.directions_clicks} directions` },
          pending,
        ]}
      />
    );
  }

  return (
    <StatStrip
      items={[
        { label: 'Published facilities', value: data.totals.published.toLocaleString(), sub: `${data.totals.facilities.toLocaleString()} records in total` },
        { label: 'Searches → profile', value: usage.search_to_profile_pct === null ? '—' : `${usage.search_to_profile_pct}%`, sub: `${usage.searches.toLocaleString()} searches` },
        pending,
        { label: 'Stale records', value: data.totals.stale.toLocaleString(), sub: data.traceable_source_pct === null ? 'need re-verification' : `${data.traceable_source_pct}% have a traceable source`, tone: data.totals.stale ? 'danger' : 'default' },
      ]}
    />
  );
}
