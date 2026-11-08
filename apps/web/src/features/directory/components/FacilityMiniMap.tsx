import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';
import { AreaPin } from '../../locations/components/AreaPin';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** A small OpenStreetMap map with the facility's pin. */
export default function FacilityMiniMap({ name, lat, lng }: { name: string; lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <AreaPin name={name} lat={lat} lng={lng} />
    </MapContainer>
  );
}
