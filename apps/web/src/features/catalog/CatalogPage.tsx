import { useState } from 'react';
import { ActionsHeader, RowActions } from '../../components/ui/RowActions';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { PageHead } from '../../components/ui/PageHead';
import { PAGE_SIZE, Pagination, pageOf } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { Pill } from '../../components/ui/Pill';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segmented } from '../../components/ui/Segmented';
import { Tabs } from '../../components/ui/Tabs';
import { ApiError } from '../../lib/api';
import { useDebouncedValue } from '../../lib/useLiveSearch';
import { type CatalogEntry, type CatalogKind, categoryLabel, useCatalog, useCatalogAction } from './api';
import { CatalogForm } from './components/CatalogForm';

const NOUN: Record<CatalogKind, string> = { services: 'service', 'facility-types': 'facility type' };

/**
 * Services & facility types: the lists every facility chooses from and the public search
 * filters by. Renaming is safe (records link by a fixed short name); items in use are
 * archived instead of deleted, so facilities that list them keep them.
 */
export function CatalogPage() {
  const [kind, setKind] = useState<CatalogKind>('services');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [text, setText] = useState('');
  const query = useDebouncedValue(text, 250);
  const catalog = useCatalog(kind, status, query);
  const action = useCatalogAction(kind);
  const [editing, setEditing] = useState<CatalogEntry | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CatalogEntry | null>(null);
  const noun = NOUN[kind];
  const counts = catalog.data?.meta.counts;
  const [page, setPage] = useState(1);
  const all = catalog.data?.data ?? [];
  const { rows: items, lastPage, page: current } = pageOf(all, page, PAGE_SIZE);

  if (catalog.error instanceof ApiError && catalog.error.status === 403) {
    return <Alert tone="warning">Only system admins manage services and facility types.</Alert>;
  }

  const switchKind = (next: CatalogKind) => {
    setKind(next);
    setPage(1);
    setText('');
    setStatus('active');
  };

  return (
    <div className="space-y-6">
      <PageHead title="Services & types" description="The lists facilities choose from, and the public search filters by.">
        <Button variant="primary" onClick={() => setEditing('new')}><Icon name="plus" /> Add {noun}</Button>
      </PageHead>

      <Tabs label="Catalog" value={kind} onChange={switchKind} items={[{ value: 'services', label: 'Services' }, { value: 'facility-types', label: 'Facility types' }]} />

      {action.error instanceof ApiError && <Alert tone="danger">{action.error.body.message}</Alert>}

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <Segmented label="Show" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: 'active', label: `In use (${counts?.active ?? '…'})` }, { value: 'archived', label: `Archived (${counts?.archived ?? '…'})` }]} />
          <SearchInput className="sm:w-72" aria-label={`Search ${noun}s`} placeholder={`Search ${noun}s`} value={text} busy={catalog.isFetching} onChange={(event) => { setText(event.target.value); setPage(1); }} onClear={() => setText('')} />
        </div>

        {catalog.isPending ? (
          <p className="p-4 text-sm text-zinc-500">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon="tag" title={query ? `No ${noun} matches “${query}”` : status === 'archived' ? `No archived ${noun}s` : `No ${noun}s yet`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  {kind === 'services' && <th className="px-3 py-2.5 font-medium">Category</th>}
                  <th className="px-3 py-2.5 font-medium">Used by</th>
                  <ActionsHeader />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                {items.map((item) => {
                  const busy = action.isPending && action.variables?.slug === item.slug;

                  return (
                    <tr key={item.slug}>
                      <td className="min-w-[200px] px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</div>
                        <div className="font-mono text-[11px] text-zinc-500">{item.slug}</div>
                        {item.description && <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{item.description}</div>}
                      </td>
                      {kind === 'services' && <td className="px-3 py-3"><Pill>{categoryLabel(item.category)}</Pill></td>}
                      <td className="px-3 py-3 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">{item.facilities} {item.facilities === 1 ? 'facility' : 'facilities'}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          label={`Actions for ${item.name}`}
                          actions={[
                            { label: 'Edit', icon: 'edit', onClick: () => setEditing(item), hidden: item.archived },
                            { label: 'Archive', icon: 'archive', onClick: () => action.mutate({ slug: item.slug, action: 'archive' }), disabled: busy, hidden: item.archived },
                            { label: 'Restore', icon: 'refresh', onClick: () => action.mutate({ slug: item.slug, action: 'restore' }), disabled: busy, hidden: !item.archived },
                            { label: 'Delete', icon: 'trash', tone: 'danger', onClick: () => setDeleting(item), hidden: item.facilities > 0 },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {all.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <Pagination page={current} lastPage={lastPage} total={all.length} perPage={PAGE_SIZE} onChange={setPage} noun={`${noun}s`} />
          </div>
        )}
      </Panel>

      <p className="text-xs text-zinc-500">
        Archived {noun}s disappear from facility forms and public search filters. Facilities that already list one keep it until someone edits them. Only {noun}s no facility uses can be deleted.
      </p>

      <CatalogForm kind={kind} noun={noun} entry={editing} categories={catalog.data?.meta.categories ?? []} onClose={() => setEditing(null)} />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? ''}?`}
        description={`No facility uses this ${noun}. Deleting it cannot be undone.`}
        footer={(
          <>
            <Button onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" disabled={action.isPending} onClick={() => deleting && action.mutate({ slug: deleting.slug, action: 'delete' }, { onSettled: () => setDeleting(null) })}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">If you might need it again, archive it instead.</p>
      </Modal>
    </div>
  );
}
