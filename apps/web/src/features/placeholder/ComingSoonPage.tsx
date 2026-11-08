import type { NavItem } from '../../app/navigation';
import { Icon } from '../../components/ui/Icon';

export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-zinc-300 py-24 text-center dark:border-zinc-700">
      <div className="max-w-md px-6">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-card bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <Icon name={item.icon} className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{item.label}</h1>
        <p className="mt-1 text-sm text-zinc-500">{item.summary}</p>
        <p className="mt-4 inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Built in phase {item.phase}</p>
      </div>
    </div>
  );
}
