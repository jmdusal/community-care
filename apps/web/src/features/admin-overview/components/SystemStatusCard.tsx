import { Icon } from '../../../components/ui/Icon';
import { Panel } from '../../../components/ui/Panel';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { useHealth } from './useHealth';

export function SystemStatusCard() {
  const { data, error, isPending, refetch, isFetching } = useHealth();

  const state = isPending ? 'checking' : error ? 'unreachable' : data.status;
  const tone = { checking: 'bg-zinc-400', ok: 'bg-emerald-500', degraded: 'bg-amber-500', unreachable: 'bg-rose-500' }[state];
  const label = { checking: 'Checking…', ok: 'All systems normal', degraded: 'Degraded', unreachable: 'API unreachable' }[state];

  return (
    <Panel
      title="System status"
      description="GET /api/v1/health · refreshes every 30 seconds"
      action={
        <button onClick={() => refetch()} className="rounded-control p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Refresh status">
          <Icon name="refresh" className={cx('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      }
    >
      <div className="px-5 pb-5">
        <p className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
          <span className={cx('h-2.5 w-2.5 rounded-full', tone)} />
          {label}
        </p>

        {data && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {Object.entries(data.checks).map(([name, result]) => (
              <div key={name} className="rounded-control bg-zinc-50 p-3 dark:bg-zinc-800/60">
                <dt className="text-xs text-zinc-600 capitalize">{name}</dt>
                <dd className={cx('font-medium', result === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>{result}</dd>
              </div>
            ))}
            <div className="rounded-control bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <dt className="text-xs text-zinc-600">Cache driver</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">{data.drivers.cache}</dd>
            </div>
            <div className="rounded-control bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <dt className="text-xs text-zinc-600">Queue driver</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">{data.drivers.queue}</dd>
            </div>
          </dl>
        )}

        {error && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {error instanceof ApiError ? error.body.message : 'Could not reach the API.'} Check that Herd is serving
            <code className="mx-1 rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">communitycare-api.test</code>
            and DBngin's MySQL is running.
          </p>
        )}
      </div>
    </Panel>
  );
}
