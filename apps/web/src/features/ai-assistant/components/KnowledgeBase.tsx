import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Icon } from '../../../components/ui/Icon';
import { Pagination } from '../../../components/ui/Pagination';
import { Panel } from '../../../components/ui/Panel';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Segmented } from '../../../components/ui/Segmented';
import { useLiveSearch } from '../../../lib/useLiveSearch';
import { type DocumentStatus, type KnowledgeDocument, useKnowledgeDocuments } from '../api';
import { DocumentEditor } from './DocumentEditor';
import { DocumentTable } from './DocumentTable';

/** Approved documents the assistant may quote, with status filter, search and the editor. */
export function KnowledgeBase() {
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [q, setQ] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const search = useLiveSearch(q, (value) => { setQ(value); setPage(1); });
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [creating, setCreating] = useState(false);
  const documents = useKnowledgeDocuments({ status: status === 'all' ? undefined : status, q, page });

  return (
    <>
      <Panel
        title="Knowledge documents"
        description="FAQs and program notes from official sources. Each needs a verified date before it can be published."
        action={<Button variant="primary" onClick={() => setCreating(true)}><Icon name="upload" /> New document</Button>}
      >
        <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
          <Segmented label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }, { value: 'archived', label: 'Archived' }]} />
          <SearchInput className="h-9 w-64" aria-label="Search title or topic" placeholder="Search title or topic" value={search.text} busy={search.pending || documents.isFetching} onChange={(event) => search.setText(event.target.value)} onClear={() => search.setText('')} />
        </div>
        {documents.data && documents.data.data.length === 0 ? (
          <div className="border-t border-zinc-100 dark:border-zinc-800"><EmptyState icon="list" title="No documents">Add approved public information for the assistant to quote.</EmptyState></div>
        ) : (
          documents.data && <DocumentTable documents={documents.data.data} onEdit={setEditing} />
        )}
        {documents.data && (
          <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <Pagination perPage={documents.data.meta.per_page} page={page} lastPage={documents.data.meta.last_page} total={documents.data.meta.total} onChange={setPage} noun="documents" />
          </div>
        )}
      </Panel>
      <DocumentEditor open={creating || editing !== null} document={editing} onClose={() => { setCreating(false); setEditing(null); }} />
    </>
  );
}
