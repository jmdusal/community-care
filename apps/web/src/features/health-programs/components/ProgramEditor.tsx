import { type FormEvent, useEffect, useState } from 'react';
import { FacilityMultiPicker, type PickedFacility } from '../../../components/shared/FacilityMultiPicker';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Select } from '../../../components/ui/Select';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ApiError } from '../../../lib/api';
import { PROGRAM_CATEGORIES } from '../../../lib/programs';
import { useScope } from '../../../lib/scope';
import { type ProgramInput, useAdminProgram, useProgramStatus, useSaveProgram } from '../api';

type Form = Omit<ProgramInput, 'facility_ids'> & { facilities: PickedFacility[] };

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const EMPTY: Form = { title: '', category: 'immunization', summary: '', description: '', starts_on: today(), ends_on: null, source_name: '', source_url: '', facilities: [] };

/** Create or edit a program; publish makes it public, archive takes it down. */
export function ProgramEditor({ open, programId, onClose }: { open: boolean; programId: string | null; onClose: () => void }) {
  const program = useAdminProgram(programId);
  const { scope } = useScope();
  const save = useSaveProgram();
  const status = useProgramStatus();
  const [form, setForm] = useState<Form>(EMPTY);
  const error = (save.error ?? status.error) instanceof ApiError ? ((save.error ?? status.error) as ApiError) : null;
  const data = program.data;

  useEffect(() => {
    save.reset();
    status.reset();
    setForm(data && programId ? {
      title: data.title, category: data.category.value, summary: data.summary, description: data.description,
      starts_on: data.starts_on, ends_on: data.ends_on, source_name: data.source?.name ?? '', source_url: data.source?.url ?? '',
      facilities: (data.facilities ?? []).map((facility) => ({ id: facility.id, name: facility.name })),
    } : { ...EMPTY, facilities: scope.facilityId ? [{ id: scope.facilityId, name: scope.name ?? 'Selected facility' }] : [] });
  }, [data, programId, open]);

  const set = (key: keyof Form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const { facilities, ...rest } = form;
    save.mutate(
      { id: programId ?? undefined, input: { ...rest, ends_on: rest.ends_on || null, source_name: rest.source_name || null, source_url: rest.source_url || null, facility_ids: facilities.map((facility) => facility.id) } },
      { onSuccess: onClose },
    );
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={programId ? 'Edit program' : 'New health program'}
      description="Public programs show on the website and on each participating facility's page."
      footer={
        <>
          {programId && data?.status !== 'published' && <Button variant="brand" onClick={() => status.mutate({ id: programId, action: 'publish' }, { onSuccess: onClose })} disabled={status.isPending}>Publish</Button>}
          {programId && data?.status === 'published' && <Button variant="danger" onClick={() => status.mutate({ id: programId, action: 'archive' }, { onSuccess: onClose })} disabled={status.isPending}>Archive</Button>}
          <span className="flex-1" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="program-form" variant="primary" disabled={save.isPending}>Save</Button>
        </>
      }
    >
      <form id="program-form" onSubmit={submit} className="space-y-4">
        {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
        <Field label="Title" error={error?.field('title')}><input required className={inputClass} value={form.title} onChange={set('title')} placeholder="e.g. Measles catch-up vaccination" /></Field>
        <Field label="Category" error={error?.field('category')}><Select value={form.category} options={PROGRAM_CATEGORIES} onChange={set('category')} /></Field>
        <Field label="Summary" hint="One or two sentences for the program list." error={error?.field('summary')}><input required maxLength={300} className={inputClass} value={form.summary} onChange={set('summary')} /></Field>
        <Field label="Details" hint="Who it is for, what to bring, schedule notes." error={error?.field('description')}>
          <textarea required rows={6} className={`${inputClass} h-auto py-2`} value={form.description} onChange={set('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" error={error?.field('starts_on')}><input type="date" required className={inputClass} value={form.starts_on} onChange={set('starts_on')} /></Field>
          <Field label="Ends (optional)" error={error?.field('ends_on')}><input type="date" className={inputClass} value={form.ends_on ?? ''} onChange={set('ends_on')} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source" error={error?.field('source_name')}><input className={inputClass} value={form.source_name ?? ''} onChange={set('source_name')} placeholder="e.g. DOH Region IV-A" /></Field>
          <Field label="Source link" error={error?.field('source_url')}><input type="url" className={inputClass} value={form.source_url ?? ''} onChange={set('source_url')} placeholder="https://" /></Field>
        </div>
        <FacilityMultiPicker label="Participating facilities" scope={scope} value={form.facilities} onChange={(facilities) => setForm((current) => ({ ...current, facilities }))} />
        {error?.field('facility_ids') && <p className="text-[11px] text-rose-700">{error.field('facility_ids')}</p>}
      </form>
    </SlideOver>
  );
}
