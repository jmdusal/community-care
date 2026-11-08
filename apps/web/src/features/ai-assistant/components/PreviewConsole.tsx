import { type FormEvent, useState } from 'react';
import { AssistantAnswerCard } from '../../../components/shared/AssistantAnswerCard';
import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { Panel } from '../../../components/ui/Panel';
import { ApiError } from '../../../lib/api';
import { useAsk } from '../../../lib/assistant';
import { useRegions } from '../../../lib/catalog';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';

/** Ask exactly what the public would, even while the public assistant is off. Logged as "preview". */
export function PreviewConsole() {
  const ask = useAsk('/admin/assistant/preview');
  const regions = useRegions();
  const [message, setMessage] = useState('');
  const [region, setRegion] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask.mutate({ message, ...(region ? { region_code: region } : {}) });
  };

  return (
    <Panel title="Test console" description="Same pipeline as the public endpoint: safety screen → retrieval → provider → citation check.">
      <div className="space-y-4 px-5 pb-5">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input aria-label="Test question" className={inputClass} placeholder="Ask a question as a member of the public would" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} />
          <Select aria-label="Region" className="sm:w-56" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Any region" options={(regions.data ?? []).map((item) => ({ value: item.code, label: item.name }))} />
          <Button type="submit" variant="primary" disabled={ask.isPending || message.trim().length < 3}>{ask.isPending ? 'Asking…' : 'Ask'}</Button>
        </form>
        {ask.error && <Alert tone="danger">{ask.error instanceof ApiError ? ask.error.body.message : 'Request failed.'}</Alert>}
        {ask.data && <AssistantAnswerCard answer={ask.data} showDiagnostics />}
      </div>
    </Panel>
  );
}
