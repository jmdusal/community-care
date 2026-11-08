import { type FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { SlideOver } from '../../../components/ui/SlideOver';
import { ApiError } from '../../../lib/api';
import { type DocumentInput, type KnowledgeDocument, useChangeDocumentStatus, useSaveDocument } from '../api';

const EMPTY: DocumentInput = { title: '', body: '', topic: '', source_name: '', source_url: '', verified_at: null };

/** Create or edit a document; publish makes it quotable by the assistant. */
export function DocumentEditor({ open, document, onClose }: { open: boolean; document: KnowledgeDocument | null; onClose: () => void }) {
  const save = useSaveDocument();
  const change = useChangeDocumentStatus();
  const [form, setForm] = useState<DocumentInput>(EMPTY);
  const error = (save.error ?? change.error) instanceof ApiError ? ((save.error ?? change.error) as ApiError) : null;

  useEffect(() => {
    save.reset();
    change.reset();
    setForm(document ? { title: document.title, body: document.body, topic: document.topic ?? '', source_name: document.source_name, source_url: document.source_url ?? '', verified_at: document.verified_at?.slice(0, 10) ?? null } : EMPTY);
  }, [document, open]);

  const set = (key: keyof DocumentInput) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value || (key === 'verified_at' ? null : '') }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ id: document?.id, input: { ...form, topic: form.topic || null, source_url: form.source_url || null } }, { onSuccess: onClose });
  };

  const setStatus = (action: 'publish' | 'archive') => document && change.mutate({ id: document.id, action }, { onSuccess: onClose });

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={document ? 'Edit document' : 'New knowledge document'}
      description="Only published documents are used by the assistant. Paste approved public information only, never patient data."
      footer={
        <>
          {document && document.status !== 'published' && <Button variant="brand" onClick={() => setStatus('publish')} disabled={change.isPending || !document.verified_at}>Publish</Button>}
          {document && document.status === 'published' && <Button variant="danger" onClick={() => setStatus('archive')} disabled={change.isPending}>Archive</Button>}
          <span className="flex-1" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="document-form" variant="primary" disabled={save.isPending}>Save</Button>
        </>
      }
    >
      <form id="document-form" onSubmit={submit} className="space-y-4">
        {error && !error.body.fields && <Alert tone="danger">{error.body.message}</Alert>}
        {document && !document.verified_at && <Alert tone="warning">Set the verified date and save before publishing.</Alert>}
        <Field label="Title" error={error?.field('title')}><input required className={inputClass} value={form.title} onChange={set('title')} /></Field>
        <Field label="Content" hint="Plain text. The assistant quotes this; keep it short and factual." error={error?.field('body')}>
          <textarea required rows={10} className={`${inputClass} h-auto py-2`} value={form.body} onChange={set('body')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic" error={error?.field('topic')}><input className={inputClass} placeholder="e.g. immunization" value={form.topic ?? ''} onChange={set('topic')} /></Field>
          <Field label="Verified against source on" error={error?.field('verified_at')}><input type="date" className={inputClass} value={form.verified_at ?? ''} onChange={set('verified_at')} /></Field>
        </div>
        <Field label="Source name" error={error?.field('source_name')}><input required className={inputClass} placeholder="e.g. DOH Department Memorandum 2026-0123" value={form.source_name} onChange={set('source_name')} /></Field>
        <Field label="Source link" error={error?.field('source_url')}><input type="url" className={inputClass} placeholder="https://" value={form.source_url ?? ''} onChange={set('source_url')} /></Field>
      </form>
    </SlideOver>
  );
}
