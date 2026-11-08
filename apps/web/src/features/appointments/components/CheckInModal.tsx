import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Modal';
import { ApiError } from '../../../lib/api';
import { formatTime } from '../../../lib/booking';
import { cx } from '../../../lib/cx';
import { type CheckInResult, useCheckIn } from '../api';

/** The browser's built-in QR reader (Chrome, Edge, Android). Not in TypeScript's DOM types yet. */
type DetectedCode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function barcodeDetector(): BarcodeDetectorConstructor | null {
  const detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

  return detector && typeof navigator.mediaDevices?.getUserMedia === 'function' ? detector : null;
}

/**
 * Desk check-in for booked patients: scan the QR code on their phone (camera, or a USB
 * scanner that types into the box) or type the reference code. A confirmed appointment
 * for today gets the next queue number, so booked patients and walk-ins share one line.
 */
export function CheckInModal({ facilityId, facilityName, open, onClose }: { facilityId: string; facilityName?: string; open: boolean; onClose: () => void }) {
  const checkIn = useCheckIn(facilityId);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const canScan = barcodeDetector() !== null;

  const submit = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy.current) {
      return;
    }
    busy.current = true;
    setError(null);
    setResult(null);
    checkIn.mutate(trimmed, {
      onSuccess: (data) => {
        setResult(data);
        setCode('');
      },
      onError: (failure) => setError(failure instanceof ApiError ? (failure.field('code') ?? failure.message) : 'Could not check in. Try again.'),
      onSettled: () => {
        busy.current = false;
        inputRef.current?.focus();
      },
    });
  }, [checkIn]);

  // Camera scanning: read a frame a few times a second; a found code is checked in once,
  // then scanning pauses for a moment so the same phone is not read twice in a row.
  useEffect(() => {
    const Detector = barcodeDetector();
    if (!open || !scanning || !Detector) {
      return;
    }
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    let last = { value: '', at: 0 };
    const detector = new Detector({ formats: ['qr_code'] });

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || !video) {
        return;
      }
      try {
        const [found] = video.readyState >= 2 ? await detector.detect(video) : [];
        const now = Date.now();
        if (found?.rawValue && (found.rawValue !== last.value || now - last.at > 4000)) {
          last = { value: found.rawValue, at: now };
          submit(found.rawValue);
        }
      } catch {
        // A frame that could not be read: try the next one.
      }
      timer = window.setTimeout(tick, 300);
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          void videoRef.current.play();
        }
        void tick();
      })
      .catch(() => {
        setCameraError('The camera could not start. Allow camera access for this site, or type the reference code.');
        setScanning(false);
      });

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, scanning, submit]);

  const close = () => {
    setScanning(false);
    setResult(null);
    setError(null);
    setCode('');
    checkIn.reset();
    onClose();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(code);
  };

  return (
    <Modal open={open} onClose={close} title="Check in a booked patient" description={`Scan the QR code on their appointment, or type the reference code. They get the next number in ${facilityName ?? 'this facility'}'s queue.`}>
      <div className="space-y-4">
        {result && (
          <div role="status" className={cx('flex items-center gap-4 rounded-card border p-4', result.already_checked_in ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10')}>
            <span className="font-mono text-4xl font-bold text-zinc-900 tabular-nums dark:text-white">{result.ticket.number}</span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-zinc-900 dark:text-white">{result.already_checked_in ? 'Already checked in' : 'Checked in'}: {result.appointment.name ?? 'Patient'}</p>
              <p className="text-zinc-600 dark:text-zinc-300">Booked for {formatTime(result.appointment.starts_at)} · {result.appointment.reference_code}</p>
              <p className="text-xs text-zinc-500">Tell them their number: {result.ticket.number}.</p>
            </div>
          </div>
        )}
        {error && <Alert tone="danger">{error}</Alert>}

        {canScan && (scanning ? (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-card bg-black">
              <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
              <div aria-hidden className="pointer-events-none absolute inset-0 m-auto h-1/2 w-1/2 rounded-lg border-2 border-white/80" />
            </div>
            <Button className="w-full" onClick={() => setScanning(false)}><Icon name="x" /> Stop camera</Button>
          </div>
        ) : (
          <Button variant="brand" className="h-11 w-full" onClick={() => { setCameraError(null); setScanning(true); }}><Icon name="qr" /> Scan QR with camera</Button>
        ))}
        {cameraError && <Alert tone="warning">{cameraError}</Alert>}

        <form onSubmit={onSubmit} className="space-y-2">
          <Field label="Reference code" hint="A USB QR scanner types the code here by itself.">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                autoFocus
                className={cx(inputClass, 'font-mono uppercase')}
                placeholder="CC-XXXX-XXXX"
                value={code}
                maxLength={40}
                autoComplete="off"
                onChange={(event) => setCode(event.target.value)}
              />
              <Button type="submit" variant="primary" className="h-10 shrink-0" disabled={!code.trim() || checkIn.isPending}>{checkIn.isPending ? 'Checking…' : 'Check in'}</Button>
            </div>
          </Field>
        </form>
      </div>
    </Modal>
  );
}
