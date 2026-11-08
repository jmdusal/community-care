import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ApiError, apiRequest } from '../../../lib/api';

/** Queues a download of every PSGC place (regions to barangays). The import shows on the Imports screen. */
export function SyncPsgcButton() {
  const sync = useMutation({ meta: { success: 'Sync started. Places update in about 90 seconds.', error: 'Could not start the sync' }, mutationFn: () => apiRequest<{ status: string; message: string }>('/admin/locations/sync', { method: 'POST' }) });

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="primary" onClick={() => sync.mutate()} disabled={sync.isPending || sync.isSuccess}>
        <Icon name="refresh" className={sync.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> {sync.isSuccess ? 'Sync queued' : 'Sync from PSGC'}
      </Button>
      {sync.isSuccess && <Alert>{sync.data.message} <Link to="/admin/imports" className="font-medium underline">Open Imports</Link></Alert>}
      {sync.error && <Alert tone="danger">{sync.error instanceof ApiError ? sync.error.body.message : 'Could not start the sync.'}</Alert>}
    </div>
  );
}
