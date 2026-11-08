import type { FacilitySummary } from '../api';

/** Listed services as small tags, optionally truncated with a "+N more". */
export function ServiceTags({ services, limit }: { services: FacilitySummary['services']; limit?: number }) {
  if (services.length === 0) {
    return <p className="text-xs text-zinc-500">No services listed yet.</p>;
  }

  const shown = limit ? services.slice(0, limit) : services;
  const hidden = services.length - shown.length;

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Listed services">
      {shown.map((service) => (
        <li key={service.slug} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{service.name}</li>
      ))}
      {hidden > 0 && <li className="px-1 py-0.5 text-xs text-zinc-500">+{hidden} more</li>}
    </ul>
  );
}
