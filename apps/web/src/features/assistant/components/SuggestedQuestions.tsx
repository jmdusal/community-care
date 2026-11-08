const SUGGESTIONS = [
  'Where can my baby get vaccines near me?',
  'Saan may libreng TB check-up?',
  'Which health centers have prenatal care?',
  'Where can I get anti-rabies shots for a dog bite?',
];

export function SuggestedQuestions({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((question) => (
        <button key={question} type="button" onClick={() => onPick(question)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-brand-400 hover:text-brand-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {question}
        </button>
      ))}
    </div>
  );
}
