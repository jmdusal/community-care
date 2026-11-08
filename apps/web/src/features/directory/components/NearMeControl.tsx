import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Select } from '../../../components/ui/Select';

const RADII = [2, 5, 10, 25, 50];

/** "Near me" using the browser's location (asked only on click), plus a radius picker. */
export function NearMeControl({ active, radius, onLocate, onRadius, onClear }: {
  active: boolean;
  radius: number;
  onLocate: (lat: number, lng: number) => void;
  onRadius: (km: number) => void;
  onClear: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'denied'>('idle');

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setStatus('denied');

      return;
    }

    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('idle');
        onLocate(Number(position.coords.latitude.toFixed(4)), Number(position.coords.longitude.toFixed(4)));
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  if (active) {
    return (
      <div className="flex items-center gap-2">
        <Select aria-label="Search radius" value={String(radius)} onChange={(event) => onRadius(Number(event.target.value))} options={RADII.map((km) => ({ value: String(km), label: `Within ${km} km` }))} className="w-36" />
        <Button variant="ghost" onClick={onClear} aria-label="Stop searching near me"><Icon name="x" /> Near me</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={locate} disabled={status === 'locating'}>
        <Icon name="locate" /> {status === 'locating' ? 'Locating…' : 'Near me'}
      </Button>
      {status === 'denied' && <span className="text-xs text-rose-700">Location unavailable. Choose a region instead.</span>}
    </div>
  );
}
