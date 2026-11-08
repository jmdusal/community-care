import { cx } from '../../lib/cx';

const palette = ['bg-teal-700', 'bg-sky-700', 'bg-violet-600', 'bg-amber-700', 'bg-rose-600', 'bg-emerald-700'];

/** Initials in a colored circle; the color is stable for a given name. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.replace(/^Brgy\.\s*/, '').split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase();
  const color = palette[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];

  return (
    <span aria-hidden="true" className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white', color, className)}>
      {initials}
    </span>
  );
}
