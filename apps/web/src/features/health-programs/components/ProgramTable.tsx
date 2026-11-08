import { ActionsHeader, RowActions } from '../../../components/ui/RowActions';
import { Pill, type Tone } from '../../../components/ui/Pill';
import { type HealthProgram, programDates } from '../../../lib/programs';
import type { ProgramStatus } from '../api';

const STATUS_TONES: Record<ProgramStatus, Tone> = { draft: 'zinc', published: 'emerald', archived: 'amber' };

export function ProgramTable({ programs, onOpen }: { programs: HealthProgram[]; onOpen: (program: HealthProgram) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="px-4 py-2.5 font-medium">Program</th>
            <th className="px-3 py-2.5 font-medium">Dates</th>
            <th className="px-3 py-2.5 font-medium">Facilities</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <ActionsHeader />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {programs.map((program) => (
            <tr key={program.id}>
              <td className="min-w-[260px] px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{program.title}</div>
                <div className="text-xs text-zinc-500">{program.category.label}</div>
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">{programDates(program)}</td>
              <td className="px-3 py-3 text-xs text-zinc-600 tabular-nums dark:text-zinc-400">{program.facility_count ?? 0}</td>
              <td className="px-3 py-3">{program.status && <Pill tone={STATUS_TONES[program.status]}>{program.status}</Pill>}</td>
              <td className="px-4 py-3 text-right"><RowActions label={`Actions for ${program.title}`} actions={[{ label: 'Open', icon: 'eye', onClick: () => onOpen(program) }]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
