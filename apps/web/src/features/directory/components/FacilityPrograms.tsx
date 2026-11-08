import { Link } from 'react-router';
import { programDates } from '../../../lib/programs';
import type { FacilityDetail } from '../api';

/** Current health programs at this facility. */
export function FacilityPrograms({ programs }: { programs: NonNullable<FacilityDetail['programs']> }) {
  return (
    <ul className="space-y-2">
      {programs.map((program) => (
        <li key={program.id}>
          <Link to={`/programs/${program.id}`} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-100">{program.title}</Link>
          <span className="block text-xs text-zinc-500">{program.category} · {programDates(program)}</span>
        </li>
      ))}
    </ul>
  );
}
