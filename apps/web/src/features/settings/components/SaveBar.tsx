import { Button } from '../../../components/ui/Button';

/** Floating "unsaved changes" bar with discard and save. */
export function SaveBar({ count, saving, onDiscard, onSave }: { count: number; saving: boolean; onDiscard: () => void; onSave: () => void }) {
  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-card border border-zinc-200 bg-white py-2 pr-2 pl-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <span className="text-sm whitespace-nowrap text-zinc-600 dark:text-zinc-300">
        {count} unsaved {count === 1 ? 'change' : 'changes'}
      </span>
      <Button variant="ghost" onClick={onDiscard}>Discard</Button>
      <Button variant="primary" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save changes'}</Button>
    </div>
  );
}
