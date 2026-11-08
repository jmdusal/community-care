import { divIcon } from 'leaflet';
import { Marker, Popup, Tooltip } from 'react-leaflet';

/**
 * A pin on the area's reference point from OpenStreetMap (town proper for a city,
 * the barangay's marked centre for a barangay). Drawn as inline SVG, so no
 * marker image files are needed.
 */
const PIN = divIcon({
  className: '',
  iconSize: [30, 40],
  iconAnchor: [15, 38],
  tooltipAnchor: [0, -36],
  popupAnchor: [0, -34],
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15 1C7.3 1 1 7.1 1 14.7 1 25 15 39 15 39s14-14 14-24.3C29 7.1 22.7 1 15 1z" fill="#0d9488" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="14.5" r="5" fill="#ffffff"/>
  </svg>`,
});

export function AreaPin({ name, lat, lng }: { name: string; lat: number; lng: number }) {
  const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  return (
    <Marker position={[lat, lng]} icon={PIN} title={name} alt={`Pin for ${name}`} zIndexOffset={1000}>
      <Tooltip direction="top" permanent>{name}</Tooltip>
      <Popup>
        <strong>{name}</strong>
        <br />
        <span>{coordinates}</span>
        <br />
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`} target="_blank" rel="noreferrer">Open in OpenStreetMap</a>
        {' · '}
        <button type="button" onClick={() => void navigator.clipboard?.writeText(coordinates)} style={{ color: '#0d9488', textDecoration: 'underline' }}>Copy coordinates</button>
      </Popup>
    </Marker>
  );
}
