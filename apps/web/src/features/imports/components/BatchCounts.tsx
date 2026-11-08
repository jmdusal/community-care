import { cx } from '../../../lib/cx';
import type { ImportBatch } from '../api';

type CountTile = { key: string; label: string; tone?: string };

const facilityTiles: CountTile[] = [
  { key: 'new', label: 'New' },
  { key: 'updated', label: 'Updated' },
  { key: 'unchanged', label: 'Unchanged' },
  { key: 'duplicates', label: 'Duplicate candidates', tone: 'text-violet-600 dark:text-violet-400' },
  { key: 'conflicts', label: 'Coordinate conflicts', tone: 'text-amber-700 dark:text-amber-400' },
  { key: 'invalid', label: 'Invalid rows', tone: 'text-rose-700 dark:text-rose-400' },
];

const geographyTiles: CountTile[] = [
  { key: 'created', label: 'Created' },
  { key: 'updated', label: 'Updated' },
  { key: 'orphaned', label: 'Skipped (no parent)', tone: 'text-amber-700 dark:text-amber-400' },
];

/** The batch's result counts; zero values are dimmed so non-zero ones stand out. */
export function BatchCounts({ batch }: { batch: ImportBatch }) {
  if (batch.counts === null) {
    return null;
  }

  const tiles = batch.kind === 'geography' ? geographyTiles : facilityTiles;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => {
        const value = batch.counts?.[tile.key] ?? 0;

        return (
          <div key={tile.key} className="rounded-control bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <div className="text-[11px] text-zinc-500">{tile.label}</div>
            <div className={cx('text-lg font-semibold tabular-nums', value ? (tile.tone ?? 'text-zinc-900 dark:text-white') : 'text-zinc-300 dark:text-zinc-600')}>{value.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}
