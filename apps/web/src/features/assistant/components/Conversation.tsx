import { AssistantAnswerCard } from '../../../components/shared/AssistantAnswerCard';
import type { AssistantAnswer } from '../../../lib/assistant';

export type Turn = { id: number; question: string; answer?: AssistantAnswer; error?: string };

/** Questions and answers in this visit only. Nothing is kept after the page closes. */
export function Conversation({ turns }: { turns: Turn[] }) {
  return (
    <ol className="space-y-5" aria-live="polite">
      {turns.map((turn) => (
        <li key={turn.id} className="space-y-2">
          <p className="ml-auto w-fit max-w-[85%] rounded-card bg-brand-700 px-4 py-2 text-sm text-white">{turn.question}</p>
          {turn.answer ? (
            <AssistantAnswerCard answer={turn.answer} />
          ) : turn.error ? (
            <p className="rounded-card border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{turn.error}</p>
          ) : (
            <p className="text-sm text-zinc-500">Looking through approved records…</p>
          )}
        </li>
      ))}
    </ol>
  );
}
