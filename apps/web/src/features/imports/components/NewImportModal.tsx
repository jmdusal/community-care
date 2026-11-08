import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { type ImportBatch, useSources, useStartImport } from '../api';

export function NewImportModal({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (batch: ImportBatch) => void }) {
  const sources = useSources();
  const start = useStartImport();
  const [source, setSource] = useState('psa_psgc');
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [terms, setTerms] = useState('');
  const [recorded, setRecorded] = useState(false);
  const error = start.error instanceof ApiError ? start.error : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (file === null) {
      return;
    }

    const form = new FormData();
    form.append('source', source);
    form.append('file', file);
    form.append('source_version', version);
    form.append('usage_terms', terms);
    form.append('terms_recorded', recorded ? '1' : '0');

    start.mutate(form, {
      onSuccess: (batch) => {
        setFile(null);
        setRecorded(false);
        onStarted(batch);
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New import"
      description="Records go to staging first. Published data is never overwritten directly."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-import" disabled={file === null || !recorded || start.isPending}>
            {start.isPending ? 'Uploading…' : 'Start import'}
          </Button>
        </>
      }
    >
      <form id="new-import" onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          {(sources.data ?? []).map((item) => (
            <label key={item.key} className={cx('flex cursor-pointer items-start gap-3 rounded-control border p-3 transition', source === item.key ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/5' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700')}>
              <input type="radio" name="source" checked={source === item.key} onChange={() => setSource(item.key)} className="mt-0.5 accent-brand-600" />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                <span className="block text-xs text-zinc-500">{item.kind === 'geography' ? 'Location reference data (applied directly)' : 'Facility records (staged and reviewed)'}</span>
              </span>
            </label>
          ))}
        </div>

        <Field label="CSV file" error={error?.field('file')} hint="CSV, up to 50 MB. Save Excel exports as CSV first.">
          <input type="file" accept=".csv,text/csv" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-control file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-zinc-300 dark:file:bg-zinc-800" />
        </Field>
        <Field label="Source version" hint="Release or export date, e.g. 2026-Q3" error={error?.field('source_version')}>
          <input className={inputClass} value={version} onChange={(event) => setVersion(event.target.value)} />
        </Field>
        <Field label="Usage terms" error={error?.field('usage_terms')}>
          <textarea rows={2} className={cx(inputClass, 'h-auto py-2')} value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="e.g. Public data, attribution required" />
        </Field>
        <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" checked={recorded} onChange={(event) => setRecorded(event.target.checked)} className="mt-0.5 accent-brand-600" />
          I've recorded this file's source, date, version and usage terms.
        </label>
        {error && !error.body.fields && <p className="text-sm text-rose-700">{error.body.message}</p>}
      </form>
    </Modal>
  );
}
