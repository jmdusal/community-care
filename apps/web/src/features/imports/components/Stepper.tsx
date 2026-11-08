import { Icon } from '../../../components/ui/Icon';
import { cx } from '../../../lib/cx';
import type { ImportBatch } from '../api';
import { pipeline } from '../presentation';

export function Stepper({ batch }: { batch: ImportBatch }) {
  const currentIndex = pipeline.findIndex((item) => item.step === batch.current_step);
  const finished = batch.status === 'published';
  const failed = batch.status === 'failed';

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <ol className="flex min-w-[520px]">
        {pipeline.map((item, index) => {
          const done = finished || index < currentIndex;
          const isFailed = failed && index === currentIndex;
          const current = !done && !isFailed && index === currentIndex;

          return (
            <li key={item.step} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 && <span className={cx('absolute top-3 right-1/2 h-0.5 w-full', done || index <= currentIndex ? 'bg-brand-500' : 'bg-zinc-200 dark:bg-zinc-700')} />}
              <span
                className={cx(
                  'relative z-10 grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ring-4 ring-white dark:ring-zinc-900',
                  done && 'bg-brand-600 text-white',
                  isFailed && 'bg-rose-500 text-white',
                  current && 'border-2 border-brand-500 bg-white text-brand-700 dark:bg-zinc-900',
                  !done && !isFailed && !current && 'bg-zinc-100 text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800',
                )}
              >
                {done ? <Icon name="check" className="h-3 w-3" /> : isFailed ? '!' : index + 1}
              </span>
              <span className={cx('mt-1.5 text-[11px]', current ? 'font-medium text-brand-700 dark:text-brand-500' : isFailed ? 'font-medium text-rose-700' : 'text-zinc-500')}>{item.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
