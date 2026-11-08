import 'leaflet/dist/leaflet.css';
import type { LatLngBoundsExpression } from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';
import type { AreaMapData } from '../api';
import { AreaPin } from './AreaPin';
import { MARKER_COLORS, NEUTRAL } from './mapLegend';

/**
 * OpenStreetMap tiles by default (free, no API key; attribution is required).
 * For production traffic set VITE_MAP_TILE_URL to a tile provider you have an account with.
 */
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Leaflet map of one area: its boundary and its facilities as dots. */
export default function AreaMap({ data }: { data: AreaMapData & { map: NonNullable<AreaMapData['map']> } }) {
  const [south, west, north, east] = data.map.bbox;
  const bounds: LatLngBoundsExpression = [[south, west], [north, east]];

  return (
    <MapContainer key={data.area.code} bounds={bounds} boundsOptions={{ padding: [16, 16] }} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      {data.map.boundary && (
        <GeoJSON key={`b-${data.area.code}`} data={data.map.boundary} style={{ color: '#0d9488', weight: 2, fillColor: '#14b8a6', fillOpacity: 0.08 }} />
      )}
      {!data.map.approximate && <AreaPin name={data.area.name} lat={data.map.center.lat} lng={data.map.center.lng} />}
      {data.facilities.map((facility) => (
        <CircleMarker
          key={facility.id}
          center={[facility.lat, facility.lng]}
          radius={7}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: MARKER_COLORS[facility.verification_status] ?? NEUTRAL, fillOpacity: 1 }}
        >
          <Popup>
            <strong>{facility.name}</strong>
            <br />
            <span>{facility.verification_status.replace('_', ' ')}{facility.published ? ' · published' : ' · not published'}</span>
            {facility.published && (
              <>
                <br />
                <Link to={`/facilities/${facility.id}`} target="_blank">Open public page</Link>
              </>
            )}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
