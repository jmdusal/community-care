import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';

export type Coordinates = { lat: number; lng: number };

/** Question box with an optional "use my location" switch (location is only used to sort facilities). */
export function AskForm({ onAsk, pending, coordinates, onCoordinates }: {
  onAsk: (message: string) => void;
  pending: boolean;
  coordinates: Coordinates | null;
  onCoordinates: (value: Coordinates | null) => void;
}) {
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (text.length >= 3) {
      onAsk(text);
      setMessage('');
    }
  };

  const toggleLocation = () => {
    if (coordinates) {
      onCoordinates(null);

      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCoordinates({ lat: Number(position.coords.latitude.toFixed(4)), lng: Number(position.coords.longitude.toFixed(4)) });
        setLocating(false);
      },
      () => {
        setLocationError('Location was not shared. Name your city or barangay in the question instead.');
        setLocating(false);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="assistant-question" className="sr-only">Your question</label>
      <div className="flex gap-2">
        <input
          id="assistant-question"
          className={inputClass}
          placeholder="e.g. Where can my baby get vaccines in Antipolo?"
          maxLength={500}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          autoComplete="off"
        />
        <Button type="submit" variant="primary" disabled={pending || message.trim().length < 3}>{pending ? 'Asking…' : 'Ask'}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <button type="button" onClick={toggleLocation} disabled={locating} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline disabled:opacity-60 dark:text-brand-100">
          <Icon name="locate" className="h-3.5 w-3.5" />
          {coordinates ? 'Using your location · turn off' : locating ? 'Locating…' : 'Use my location'}
        </button>
        <span>Don't include names, ID numbers or medical history.</span>
      </div>
      {locationError && <p className="text-xs text-amber-700 dark:text-amber-400">{locationError}</p>}
    </form>
  );
}
