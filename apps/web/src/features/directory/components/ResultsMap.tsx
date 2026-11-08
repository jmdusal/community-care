import 'leaflet/dist/leaflet.css';
import type { LatLngBoundsExpression } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';
import type { FacilitySummary } from '../api';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** The current page of results on an OpenStreetMap map; tap a dot for the facility. */
export default function ResultsMap({ facilities }: { facilities: FacilitySummary[] }) {
  const placed = facilities.filter((facility) => facility.coordinates !== null);
  if (placed.length === 0) {
    return <div className="grid h-full place-items-center text-sm text-zinc-500">None of these facilities has a map position yet.</div>;
  }

  const lats = placed.map((facility) => facility.coordinates!.lat);
  const lngs = placed.map((facility) => facility.coordinates!.lng);
  const pad = placed.length === 1 ? 0.01 : 0;
  const bounds: LatLngBoundsExpression = [[Math.min(...lats) - pad, Math.min(...lngs) - pad], [Math.max(...lats) + pad, Math.max(...lngs) + pad]];

  return (
    <MapContainer key={placed.map((facility) => facility.id).join()} bounds={bounds} boundsOptions={{ padding: [32, 32] }} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      {placed.map((facility) => (
        <CircleMarker key={facility.id} center={[facility.coordinates!.lat, facility.coordinates!.lng]} radius={8} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0d9488', fillOpacity: 1 }}>
          <Popup>
            <strong>{facility.name}</strong>
            <br />
            <span>{facility.type?.name ?? 'Facility'}</span>
            <br />
            <Link to={`/facilities/${facility.id}`}>View details</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
