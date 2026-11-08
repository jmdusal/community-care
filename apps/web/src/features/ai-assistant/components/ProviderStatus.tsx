import { Link } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { KeyValueList } from '../../../components/ui/KeyValueList';
import { Panel } from '../../../components/ui/Panel';
import { Pill } from '../../../components/ui/Pill';
import type { AssistantOverview } from '../api';

const PROVIDER_LABELS: Record<string, string> = {
  grounded: 'Grounded (no AI model; lists approved records word for word)',
  claude: 'Claude (Anthropic), from retrieved records only',
};

/** Which provider answers, whether the public assistant is on, and the knowledge base size. */
export function ProviderStatus({ overview }: { overview: AssistantOverview }) {
  return (
    <Panel title="Configuration" description="Provider is set in the API's .env; the public switch is a setting.">
      <div className="space-y-3 px-5 pb-5">
        {overview.provider_note && <Alert tone="warning">{overview.provider_note}</Alert>}
        <KeyValueList
          rows={[
            ['Public assistant', overview.enabled ? <Pill tone="emerald" dot>On</Pill> : <span className="flex items-center gap-2"><Pill tone="zinc" dot>Off</Pill><Link to="/admin/settings" className="text-xs text-brand-700 hover:underline dark:text-brand-100">Change in Settings</Link></span>],
            ['Provider', PROVIDER_LABELS[overview.provider] ?? overview.provider],
            ['Model', overview.model ?? '—'],
            ['Fallbacks to grounded', overview.fallbacks.toLocaleString()],
            ['Published documents', `${overview.documents.published}${overview.documents.stale ? ` (${overview.documents.stale} need re-verifying)` : ''}`],
            ['Drafts', overview.documents.draft.toLocaleString()],
          ]}
        />
      </div>
    </Panel>
  );
}
