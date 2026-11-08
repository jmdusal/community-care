import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/PageHead';
import { StatStrip } from '../../components/ui/StatStrip';
import { useBatches } from './api';
import { BatchDetail } from './components/BatchDetail';
import { BatchList } from './components/BatchList';
import { NewImportModal } from './components/NewImportModal';

/** Imports screen: composes the batch list, the selected batch and the upload dialog. */
export function ImportsPage() {
  const batches = useBatches();
  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const list = batches.data?.data ?? [];
  const activeId = selected ?? list[0]?.id ?? null;

  const flagged = list.filter((batch) => batch.status === 'needs_review').reduce((sum, batch) => sum + (batch.counts?.flagged ?? 0), 0);
  const failed = list.filter((batch) => batch.status === 'failed').length;
  const newImport = (
    <Button variant="primary" onClick={() => setModalOpen(true)}>
      <Icon name="upload" /> New import
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHead title="Imports" description="Every batch lands in staging first. Nothing is published until it has been reviewed.">
        {newImport}
      </PageHead>

      <StatStrip
        items={[
          { label: 'Batches', value: list.length, sub: 'most recent 50' },
          { label: 'Records processed', value: list.reduce((sum, batch) => sum + batch.records_processed, 0).toLocaleString(), sub: 'across these batches' },
          { label: 'Flagged in open batches', value: flagged, sub: 'need a reviewer', tone: flagged ? 'warning' : 'default' },
          { label: 'Failed batches', value: failed, sub: 'published data unchanged', tone: failed ? 'danger' : 'default' },
        ]}
      />

      {list.length === 0 && !batches.isPending ? (
        <EmptyState icon="database" title="No imports yet" action={newImport}>
          Start with the PSA PSGC release so facilities can be placed in their region, city and barangay. Then import the DOH NHFR export.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <BatchList batches={list} selectedId={activeId} onSelect={setSelected} />
          </div>
          <div className="xl:col-span-3">{activeId && <BatchDetail key={activeId} id={activeId} />}</div>
        </div>
      )}

      <NewImportModal open={modalOpen} onClose={() => setModalOpen(false)} onStarted={(batch) => setSelected(batch.id)} />
    </div>
  );
}
