import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Select';
import { PROGRAM_CATEGORIES, usePublicPrograms } from '../../lib/programs';
import { ProgramCard } from './components/ProgramCard';

/** Current public health programs (vaccination drives, screenings…). */
export function ProgramsPage() {
  const [category, setCategory] = useState('');
  const programs = usePublicPrograms(category || undefined);
  const list = programs.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">Health programs</h1>
          <p className="mt-1 text-sm text-zinc-500">Free and public health campaigns, and the facilities taking part.</p>
        </div>
        <Select aria-label="Category" className="sm:w-60" placeholder="All categories" value={category} options={PROGRAM_CATEGORIES} onChange={(event) => setCategory(event.target.value)} />
      </div>

      {programs.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : list.length === 0 ? (
        <EmptyState icon="megaphone" title="No current programs">Check back soon, or ask your local health center.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{list.map((program) => <ProgramCard key={program.id} program={program} />)}</div>
      )}
    </div>
  );
}
