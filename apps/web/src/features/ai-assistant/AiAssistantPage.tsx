import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { PageHead } from '../../components/ui/PageHead';
import { Tabs } from '../../components/ui/Tabs';
import { ApiError } from '../../lib/api';
import { useAssistantOverview } from './api';
import { AssistantStats } from './components/AssistantStats';
import { GuardrailChecks } from './components/GuardrailChecks';
import { KnowledgeBase } from './components/KnowledgeBase';
import { PreviewConsole } from './components/PreviewConsole';
import { ProviderStatus } from './components/ProviderStatus';

type Section = 'console' | 'documents' | 'guardrails';

/** AI assistant admin: outcomes, configuration, test console, knowledge documents and guardrails. */
export function AiAssistantPage() {
  const overview = useAssistantOverview();
  const [section, setSection] = useState<Section>('console');

  if (overview.error instanceof ApiError && overview.error.status === 403) {
    return <Alert tone="warning">Only administrators and verifiers can manage the assistant.</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHead title="AI assistant" description="Answers only from published facilities and approved documents, with citations. Emergencies and medical-advice questions are stopped first." />

      {overview.data && <AssistantStats overview={overview.data} />}

      <Tabs
        label="Assistant sections"
        value={section}
        onChange={setSection}
        items={[
          { value: 'console', label: 'Test console' },
          { value: 'documents', label: 'Knowledge documents', count: overview.data ? overview.data.documents.published + overview.data.documents.draft : undefined },
          { value: 'guardrails', label: 'Guardrails' },
        ]}
      />

      {section === 'console' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <PreviewConsole />
          {overview.data && <ProviderStatus overview={overview.data} />}
        </div>
      )}
      {section === 'documents' && <KnowledgeBase />}
      {section === 'guardrails' && <GuardrailChecks />}
    </div>
  );
}
