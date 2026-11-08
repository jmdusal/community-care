import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Panel } from '../../../components/ui/Panel';
import { Pill } from '../../../components/ui/Pill';
import { OUTCOME_LABELS } from '../../../lib/assistant';
import { useGuardrails } from '../api';

/** Runs the configured safety cases. They stop before any model call, so running them is free. */
export function GuardrailChecks() {
  const run = useGuardrails();
  const result = run.data;

  return (
    <Panel
      title="Guardrail checks"
      description="Emergency, medical-advice and prompt-injection questions must be stopped before any provider sees them."
      action={<Button onClick={() => run.mutate()} disabled={run.isPending}><Icon name="refresh" /> {run.isPending ? 'Running…' : 'Run checks'}</Button>}
    >
      {result ? (
        <div className="overflow-x-auto border-t border-zinc-100 dark:border-zinc-800">
          <p className="px-5 py-3 text-sm">
            <Pill tone={result.meta.passed === result.meta.total ? 'emerald' : 'rose'} dot>{result.meta.passed} of {result.meta.total} passed</Pill>
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="px-5 py-2 font-medium">Question</th>
                <th className="px-3 py-2 font-medium">Expected</th>
                <th className="px-3 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
              {result.data.map((row) => (
                <tr key={row.question}>
                  <td className="px-5 py-2.5 text-zinc-800 dark:text-zinc-200">{row.question}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap text-zinc-500">{OUTCOME_LABELS[row.expected]}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Pill tone={row.passed ? 'emerald' : 'rose'}>{row.passed ? 'Pass' : `Fail: ${OUTCOME_LABELS[row.actual]}`}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 pb-5 text-sm text-zinc-500">Cases are defined in <code>config/communitycare.php</code> (assistant.guardrail_cases). Run them after changing the safety rules or retrieval.</p>
      )}
    </Panel>
  );
}
