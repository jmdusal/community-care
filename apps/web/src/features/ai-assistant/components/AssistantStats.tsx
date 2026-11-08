import { type Stat, StatStrip } from '../../../components/ui/StatStrip';
import type { AssistantOverview } from '../api';

/** Public questions in the last 30 days, by outcome. Question text is never stored. */
export function AssistantStats({ overview }: { overview: AssistantOverview }) {
  const share = (count: number) => (overview.questions ? `${Math.round((count / overview.questions) * 100)}% of questions` : 'no questions yet');

  const items: Stat[] = [
    { label: `Questions · ${overview.days} days`, value: overview.questions.toLocaleString(), sub: overview.p95_latency_ms === null ? 'p95 latency —' : `p95 latency ${(overview.p95_latency_ms / 1000).toFixed(1)} s` },
    { label: 'Answered with sources', value: overview.outcomes.answered.toLocaleString(), sub: share(overview.outcomes.answered) },
    { label: 'No approved information', value: overview.outcomes.no_information.toLocaleString(), sub: share(overview.outcomes.no_information), tone: overview.outcomes.no_information > overview.outcomes.answered ? 'warning' : 'default' },
    { label: 'Emergency notices', value: overview.outcomes.emergency.toLocaleString(), sub: `${overview.outcomes.out_of_scope} declined as medical advice` },
  ];

  return <StatStrip items={items} />;
}
