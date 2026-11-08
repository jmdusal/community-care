import { Link, useParams } from 'react-router';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { ApiError } from '../../lib/api';
import { programDates, usePublicProgram } from '../../lib/programs';

/** One program: what it is, when, the source, and where to go. */
export function ProgramPage() {
  const { id = '' } = useParams();
  const program = usePublicProgram(id);

  if (program.error instanceof ApiError && program.error.status === 404) {
    return <EmptyState icon="megaphone" title="Program not found" action={<Link to="/programs" className="text-sm font-medium text-brand-700 underline">All programs</Link>}>It may have ended or been withdrawn.</EmptyState>;
  }
  if (!program.data) {
    return <p className="py-16 text-center text-sm text-zinc-500">{program.error ? 'Could not load this program.' : 'Loading…'}</p>;
  }

  const data = program.data;

  return (
    <div className="space-y-6">
      <Link to="/programs" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
        <Icon name="right" className="h-3.5 w-3.5 rotate-180" /> All programs
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="teal">{data.category.label}</Pill>
          <span className="text-sm text-zinc-500">{programDates(data)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{data.title}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{data.summary}</p>
      </header>

      <section className="rounded-card border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-800 dark:text-zinc-200">{data.description}</p>
        {data.source && (
          <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
            Source: {data.source.url ? <a href={data.source.url} target="_blank" rel="noreferrer" className="text-brand-700 underline dark:text-brand-100">{data.source.name}</a> : data.source.name}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Participating facilities</h2>
        {(data.facilities ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500">No facilities listed yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-card border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {data.facilities!.map((facility) => (
              <li key={facility.id}>
                <Link to={`/facilities/${facility.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <span>
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{facility.name}</span>
                    <span className="block text-xs text-zinc-500">{[facility.city, facility.region].filter(Boolean).join(', ')}</span>
                  </span>
                  <Icon name="right" className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500">Schedules can change. Call the facility before you go.</p>
      </section>
    </div>
  );
}
