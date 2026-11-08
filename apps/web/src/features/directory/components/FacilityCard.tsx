import { Link } from 'react-router';
import { Icon } from '../../../components/ui/Icon';
import type { FacilitySummary } from '../api';
import { formatDistance, placeLine } from '../format';
import { VerificationBadge } from './VerificationBadge';

/** One search result as a clickable card: type icon, name, place, services, verification, distance. */
export function FacilityCard({ facility }: { facility: FacilitySummary }) {
  const services = facility.services.slice(0, 4);
  const more = facility.services.length - services.length;

  return (
    <Link
      to={`/facilities/${facility.id}`}
      className="group flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-px hover:border-brand-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100" aria-hidden="true">
        <Icon name="building" className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-100">{facility.name}</h2>
            {facility.type && <p className="text-xs font-medium text-zinc-500">{facility.type.name}</p>}
          </div>
          <VerificationBadge verification={facility.verification} />
        </div>

        <p className="flex items-start gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <span className="min-w-0">
            {placeLine(facility) || 'Location not set'}
            {facility.address && <span className="block text-xs text-zinc-500">{facility.address}</span>}
          </span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {services.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Listed services">
              {services.map((service) => <li key={service.slug} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{service.name}</li>)}
              {more > 0 && <li className="px-1 py-0.5 text-xs text-zinc-500">+{more} more</li>}
            </ul>
          ) : (
            <span className="text-xs text-zinc-400">No services listed yet</span>
          )}
          <span className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
            {facility.distance_km !== undefined && <span className="inline-flex items-center gap-1"><Icon name="navigation" className="h-3 w-3" /> {formatDistance(facility.distance_km)}</span>}
            <span className="inline-flex items-center gap-0.5 font-medium text-brand-700 opacity-0 transition group-hover:opacity-100 dark:text-brand-100">View <Icon name="right" className="h-3.5 w-3.5" /></span>
          </span>
        </div>
      </div>
    </Link>
  );
}
