import { KeyValueList } from '../../../components/ui/KeyValueList';
import type { FacilityDetail } from '../api';
import { formatDay } from '../format';

const SOURCE_NAMES: Record<string, string> = {
  doh_nhfr: 'DOH National Health Facility Registry',
  facility_csv: 'CommunityCare data file',
};

/** Where the facility data came from and when it was last checked. */
export function SourceAttribution({ facility }: { facility: FacilityDetail }) {
  const rows: Array<[string, string]> = facility.sources.map((source) => [
    SOURCE_NAMES[source.name] ?? source.name,
    source.checked_at ? `checked ${formatDay(source.checked_at)}` : 'not yet checked',
  ]);

  rows.push(['Last verified by our team', facility.verification.verified_at ? formatDay(facility.verification.verified_at) : 'not yet verified']);

  return (
    <div className="space-y-2">
      <KeyValueList rows={rows} />
      <p className="text-[11px] text-zinc-500">{facility.verification.notice}</p>
    </div>
  );
}
