import { type FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { ApiError } from '../../../lib/api';
import { cx } from '../../../lib/cx';
import { type CatalogEntry, type CatalogKind, categoryLabel, useSaveCatalogEntry } from '../api';

/** Add or edit a service (name, category, description) or a facility type (name, description). */
export function CatalogForm({ kind, noun, entry, categories, onClose }: {
  kind: CatalogKind;
  noun: string;
  entry: CatalogEntry | 'new' | null;
  categories: string[];
  onClose: () => void;
}) {
  const save = useSaveCatalogEntry(kind);
  const existing = entry !== 'new' ? entry : null;
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (entry !== null) {
      setName(existing?.name ?? '');
      setCategory(existing?.category ?? '');
      setDescription(existing?.description ?? '');
      save.reset();
    }
    // Reset the form each time it opens for a different entry.
  }, [entry]);

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.field(field) : undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      ...(kind === 'services' ? { category: category.trim().toLowerCase().replace(/\s+/g, '_') } : {}),
    };
    save.mutate({ slug: existing?.slug, input }, { onSuccess: onClose });
  };

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : `Add ${noun}`}
      description={existing ? `Facilities linked to “${existing.slug}” show the new name at once.` : `Facilities can choose it as soon as it is added.`}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="catalog-form" variant="primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : existing ? 'Save changes' : `Add ${noun}`}</Button>
        </>
      )}
    >
      <form id="catalog-form" onSubmit={submit} className="space-y-4">
        {save.error instanceof ApiError && !fieldError('name') && !fieldError('category') && <Alert tone="danger">{save.error.body.message}</Alert>}
        <Field label="Name" error={fieldError('name')}>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} autoFocus placeholder={kind === 'services' ? 'e.g. Mental health' : 'e.g. Birthing home'} />
        </Field>
        {kind === 'services' && (
          <Field label="Category" hint="Groups services in the pickers. Choose one or type a new one." error={fieldError('category')}>
            <>
              <input className={inputClass} list="service-categories" value={category} onChange={(event) => setCategory(event.target.value)} required maxLength={40} placeholder="e.g. preventive" />
              <datalist id="service-categories">
                {categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
              </datalist>
            </>
          </Field>
        )}
        <Field label="Description" hint="Optional. Shown to staff, not the public." error={fieldError('description')}>
          <textarea rows={2} className={cx(inputClass, 'h-auto py-2')} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
        </Field>
      </form>
    </Modal>
  );
}
