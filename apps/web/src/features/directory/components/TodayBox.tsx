import { Icon, type IconName } from '../../../components/ui/Icon';
import { cx } from '../../../lib/cx';
import { clockTime, hhmm, type TodayStatus } from '../../../lib/today';

function Line({ icon, tone, children }: { icon: IconName; tone: 'good' | 'warn' | 'bad' | 'plain'; children: React.ReactNode }) {
  const colour = { good: 'text-emerald-700 dark:text-emerald-300', warn: 'text-amber-700 dark:text-amber-300', bad: 'text-rose-700 dark:text-rose-300', plain: 'text-zinc-700 dark:text-zinc-300' }[tone];

  return <li className={cx('flex items-start gap-2 text-sm', colour)}><Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span></li>;
}

/** "Today at this facility": what staff posted this morning. Shown only on the day it was posted. */
export function TodayBox({ today }: { today: TodayStatus }) {
  const empty = !today.doctor && !today.opening && today.out_of_stock.length === 0 && !today.note;
  if (empty) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-700/40 dark:bg-brand-700/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" /></span>
          Today at this facility
        </h2>
        {today.updated_at && <span className="text-[11px] text-zinc-500">Updated {clockTime(today.updated_at)}</span>}
      </div>
      <ul className="space-y-2">
        {today.opening === 'closed' && <Line icon="x" tone="bad">Closed today</Line>}
        {today.opening === 'closing_early' && <Line icon="clock" tone="warn">Closing early today at {hhmm(today.closes_at)}</Line>}
        {today.opening === 'open' && <Line icon="check" tone="good">Open as usual</Line>}
        {today.doctor === 'in' && <Line icon="user" tone="good">A doctor is in today</Line>}
        {today.doctor === 'out' && <Line icon="user" tone="warn">No doctor today</Line>}
        {today.out_of_stock.length > 0 && <Line icon="alert" tone="warn">Out of stock: {today.out_of_stock.join(', ')}</Line>}
        {today.note && <Line icon="megaphone" tone="plain">{today.note}</Line>}
      </ul>
    </section>
  );
}
