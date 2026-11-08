import { ActionsHeader, RowActions } from '../../../components/ui/RowActions';
import { Pill, type Tone } from '../../../components/ui/Pill';
import { formatDay } from '../../../lib/format';
import type { DocumentStatus, KnowledgeDocument } from '../api';

const STATUS_TONES: Record<DocumentStatus, Tone> = { draft: 'zinc', published: 'emerald', archived: 'amber' };

export function DocumentTable({ documents, onEdit }: { documents: KnowledgeDocument[]; onEdit: (document: KnowledgeDocument) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="px-4 py-2.5 font-medium">Document</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Verified</th>
            <th className="px-3 py-2.5 font-medium">Updated</th>
            <ActionsHeader />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="min-w-[260px] px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{document.title}</div>
                <div className="text-xs text-zinc-500">{[document.topic, document.source_name].filter(Boolean).join(' · ')}</div>
              </td>
              <td className="px-3 py-3"><Pill tone={STATUS_TONES[document.status]}>{document.status}</Pill></td>
              <td className="px-3 py-3 text-xs whitespace-nowrap">
                {document.verified_at ? <span className={document.is_stale ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-zinc-500'}>{formatDay(document.verified_at)}{document.is_stale ? ' · stale' : ''}</span> : <span className="text-zinc-500 dark:text-zinc-400">Not verified</span>}
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-500">{formatDay(document.updated_at)}{document.updated_by ? ` · ${document.updated_by}` : ''}</td>
              <td className="px-4 py-3 text-right"><RowActions label={`Actions for ${document.title}`} actions={[{ label: 'Open', icon: 'eye', onClick: () => onEdit(document) }]} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
