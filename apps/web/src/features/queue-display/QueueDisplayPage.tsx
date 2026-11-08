import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { apiRequest } from '../../lib/api';
import { cx } from '../../lib/cx';

type Display = {
  facility: { id: string; name: string };
  now_serving: Array<{ number: string; counter: string | null; status: string }>;
  waiting: number;
  next: string[];
};

/** Plays a short two-note chime (only after someone tapped "Sound on": browsers block autoplay). */
function chime(context: AudioContext) {
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const start = context.currentTime + index * 0.25;
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    oscillator.start(start);
    oscillator.stop(start + 0.4);
  });
}

/**
 * Full-screen "Now serving" board for a TV or tablet in the waiting area. Numbers only,
 * never names. Refreshes every 4 seconds; the newest called number flashes (and chimes,
 * when sound is on).
 */
export function QueueDisplayPage() {
  const { facilityId = '' } = useParams();
  const display = useQuery({ queryKey: ['queue-display', facilityId], queryFn: () => apiRequest<Display>(`/facilities/${facilityId}/queue`), refetchInterval: 4_000 });
  const [clock, setClock] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const last = useRef<string | null>(null);
  const data = display.data;
  const current = data?.now_serving[0];

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 15_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const key = current ? `${current.number}-${current.counter ?? ''}` : null;
    if (key && last.current !== null && key !== last.current) {
      setFlash(true);
      if (audio) {
        chime(audio);
      }
      const timer = window.setTimeout(() => setFlash(false), 2_500);
      last.current = key;

      return () => window.clearTimeout(timer);
    }
    last.current = key;
  }, [current, audio]);

  if (display.isError) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 p-8 text-center text-xl text-zinc-300">This display is not available. Check the facility link.</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-8 py-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold">CC</span>
          <div>
            <p className="text-xl font-semibold">{data?.facility.name ?? 'Loading…'}</p>
            <p className="text-sm text-white/60">Walk-in queue</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!audio && <button type="button" onClick={() => setAudio(new AudioContext())} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10">Sound on</button>}
          <p className="text-3xl font-semibold tabular-nums">{clock.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}</p>
        </div>
      </header>

      <main className="grid flex-1 gap-6 p-8 lg:grid-cols-[2fr_1fr]">
        <section className={cx('flex flex-col items-center justify-center rounded-3xl p-8 transition-colors duration-500', flash ? 'bg-brand-600' : 'bg-white/5')} aria-live="assertive">
          <p className="text-2xl tracking-widest text-white/70 uppercase">Now serving</p>
          <p className="mt-4 font-mono text-[9rem] leading-none font-bold tabular-nums sm:text-[12rem]">{current?.number ?? '—'}</p>
          {current?.counter && <p className="mt-6 text-4xl font-semibold">{current.counter}</p>}
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl bg-white/5 p-6">
            <p className="text-lg tracking-widest text-white/60 uppercase">Also called</p>
            <ul className="mt-3 space-y-2">
              {(data?.now_serving ?? []).slice(1, 5).map((item) => (
                <li key={`${item.number}-${item.counter}`} className="flex items-baseline justify-between text-3xl">
                  <span className="font-mono font-semibold tabular-nums">{item.number}</span>
                  <span className="text-xl text-white/70">{item.counter ?? ''}</span>
                </li>
              ))}
              {(data?.now_serving.length ?? 0) <= 1 && <li className="text-xl text-white/40">—</li>}
            </ul>
          </div>
          <div className="rounded-3xl bg-white/5 p-6">
            <p className="text-lg tracking-widest text-white/60 uppercase">Next</p>
            <p className="mt-3 font-mono text-3xl font-semibold tabular-nums">{data?.next.length ? data.next.join('  ') : '—'}</p>
            <p className="mt-4 text-lg text-white/60">{data?.waiting ?? 0} waiting</p>
          </div>
        </aside>
      </main>

      <footer className="px-8 pb-6 text-center text-sm text-white/50">Please wait for your number. In an emergency, tell the staff or call 911.</footer>
    </div>
  );
}
