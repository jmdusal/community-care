import { Link } from 'react-router';
import { Pill } from '../../../components/ui/Pill';
import { type HealthProgram, programDates } from '../../../lib/programs';

export function ProgramCard({ program }: { program: HealthProgram }) {
  return (
    <Link to={`/programs/${program.id}`} className="block rounded-card border border-zinc-200 bg-white p-5 transition hover:border-brand-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="teal">{program.category.label}</Pill>
        <span className="text-xs text-zinc-500">{programDates(program)}</span>
      </div>
      <h2 className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">{program.title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{program.summary}</p>
      {program.facility_count !== undefined && (
        <p className="mt-3 text-xs text-zinc-500">{program.facility_count} participating {program.facility_count === 1 ? 'facility' : 'facilities'}</p>
      )}
    </Link>
  );
}
