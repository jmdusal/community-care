import { Fragment } from 'react';
import { Link } from 'react-router';
import { type AssistantAnswer, type Citation, OUTCOME_LABELS, splitCitations } from '../../lib/assistant';
import { cx } from '../../lib/cx';
import { formatDay } from '../../lib/format';
import { Icon } from '../ui/Icon';
import { Pill, type Tone } from '../ui/Pill';

const OUTCOME_TONES: Record<AssistantAnswer['outcome'], Tone> = { answered: 'teal', no_information: 'zinc', emergency: 'rose', out_of_scope: 'amber' };

/** One assistant answer: text with citation markers, then its sources with freshness. */
export function AssistantAnswerCard({ answer, showDiagnostics = false }: { answer: AssistantAnswer; showDiagnostics?: boolean }) {
  const emergency = answer.outcome === 'emergency';

  return (
    <div className={cx('rounded-card border p-4', emergency ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Pill tone={OUTCOME_TONES[answer.outcome]} dot>{OUTCOME_LABELS[answer.outcome]}</Pill>
        {showDiagnostics && answer.provider && <Pill tone="zinc">{answer.provider}{answer.used_fallback ? ' (fallback)' : ''}</Pill>}
      </div>

      <AnswerText text={answer.answer} citations={answer.citations} />

      {emergency && (
        <a href="tel:911" className="mt-3 inline-flex h-10 items-center gap-2 rounded-control bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700">
          <Icon name="phone" /> Call 911
        </a>
      )}

      {answer.citations.length > 0 && <CitationList citations={answer.citations} />}
      <p className="mt-3 text-xs text-zinc-500">{answer.notice}</p>
    </div>
  );
}

/** Renders the plain-text answer, turning "[F1]" markers into small source chips. */
function AnswerText({ text, citations }: { text: string; citations: Citation[] }) {
  const keys = new Set(citations.map((citation) => citation.key));

  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {splitCitations(paragraph, keys).map((part, partIndex) =>
            part.kind === 'text' ? (
              <Fragment key={partIndex}>{part.text}</Fragment>
            ) : (
              <sup key={partIndex} className="mx-0.5 rounded bg-brand-50 px-1 text-[10px] font-semibold text-brand-700 dark:bg-brand-700/30 dark:text-brand-100">{part.key}</sup>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Sources</h3>
      <ul className="space-y-1.5">
        {citations.map((citation) => (
          <li key={citation.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="rounded bg-brand-50 px-1 text-[10px] font-semibold text-brand-700 dark:bg-brand-700/30 dark:text-brand-100">{citation.key}</span>
            {citation.type === 'facility' ? (
              <Link to={`/facilities/${citation.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-100">{citation.title}</Link>
            ) : citation.url ? (
              <a href={citation.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-100">{citation.title}</a>
            ) : (
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{citation.title}</span>
            )}
            <span className="text-xs text-zinc-500">{citation.verified_at ? `verified ${formatDay(citation.verified_at)}` : 'not yet verified'}</span>
            {citation.is_stale && <Pill tone="amber">May be out of date</Pill>}
          </li>
        ))}
      </ul>
    </div>
  );
}
