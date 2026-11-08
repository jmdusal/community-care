import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { PageHead } from '../../components/ui/PageHead';
import { Panel } from '../../components/ui/Panel';
import { type Area, useCoverage } from './api';
import { AreaMapPanel } from './components/AreaMapPanel';
import { AreaSummary } from './components/AreaSummary';
import { SyncPsgcButton } from './components/SyncPsgcButton';
import { can, useMe } from '../auth/useAuth';
import { GeoColumn } from './components/GeoColumn';

type Path = { region: Area | null; province: Area | null; city: Area | null; barangay: Area | null };

const emptyPath: Path = { region: null, province: null, city: null, barangay: null };

/** Locations screen: four GeoColumns (region → barangay) and a summary of the selected area. */
export function LocationsPage() {
  const me = useMe();
  const [path, setPath] = useState<Path>(emptyPath);

  const regions = useCoverage('region', null);
  const provinces = useCoverage('province', path.region?.code ?? null);
  // Regions without provinces (NCR) list their cities directly.
  const cityParent = path.province?.code ?? (provinces.data?.length === 0 ? (path.region?.code ?? null) : null);
  const cities = useCoverage('city', cityParent);
  const barangays = useCoverage('barangay', path.city?.code ?? null);

  const selected = path.barangay ?? path.city ?? (path.province?.kind === 'independent_cities' ? path.region : path.province) ?? path.region;
  // "Independent cities" is a grouping inside a region, not a province: map and summary use the region.
  const groupSelected = path.province?.kind === 'independent_cities';
  const mapLevel = path.barangay ? 'barangay' : path.city ? 'city' : path.province && !groupSelected ? 'province' : 'region';
  const levelName = path.barangay ? 'Barangay' : path.city ? 'City / Municipality' : path.province && !groupSelected ? (path.province.is_district ? 'District' : 'Province') : 'Region';

  return (
    <div className="space-y-6">
      <PageHead title="Locations" description="Every Philippine region, province, city/municipality and barangay (PSGC), with facility coverage per area. Sync to fetch PSA's latest list.">
        {can(me.data, 'imports.manage') && <SyncPsgcButton />}
      </PageHead>

      {regions.data?.length === 0 && (
        <Alert action={<Link to="/admin/imports" className="font-medium underline underline-offset-2">Go to Imports</Link>}>
          No PSGC data yet. Import a PSA PSGC release first.
        </Alert>
      )}

      <Panel className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4">
          <GeoColumn title="Region" areas={regions.data} selectedCode={path.region?.code ?? null} isLoading={regions.isPending} emptyHint="No regions" onSelect={(region) => setPath({ ...emptyPath, region })} />
          <GeoColumn title="Province / District" areas={provinces.data} selectedCode={path.province?.code ?? null} isLoading={provinces.isFetching} emptyHint={path.region ? 'No provinces (cities are listed directly)' : 'Select a region'} onSelect={(province) => setPath({ ...path, province, city: null, barangay: null })} />
          <GeoColumn title="City / Municipality" areas={cities.data} selectedCode={path.city?.code ?? null} isLoading={cities.isFetching} emptyHint={path.region ? 'Select a province' : 'Select a region'} onSelect={(city) => setPath({ ...path, city, barangay: null })} />
          <GeoColumn title="Barangay" areas={barangays.data} selectedCode={path.barangay?.code ?? null} isLoading={barangays.isFetching} isLeaf emptyHint="Select a city or municipality" onSelect={(barangay) => setPath({ ...path, barangay })} />
        </div>
      </Panel>

      {selected && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <AreaSummary area={selected} levelName={levelName} />
          <AreaMapPanel level={mapLevel} code={selected.code} name={selected.name} />
        </div>
      )}
    </div>
  );
}
