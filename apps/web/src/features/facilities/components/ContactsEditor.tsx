import { Button } from '../../../components/ui/Button';
import { inputClass } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Select } from '../../../components/ui/Select';
import { cx } from '../../../lib/cx';
import type { FacilityValues } from '../api';

type Contact = FacilityValues['contacts'][number];

/** Editable list of public contacts (phone, email, website). */
export function ContactsEditor({ value, onChange }: { value: Contact[]; onChange: (value: Contact[]) => void }) {
  const update = (index: number, patch: Partial<Contact>) => onChange(value.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));

  return (
    <div className="space-y-2">
      {value.map((contact, index) => (
        <div key={index} className="flex gap-2">
          <Select aria-label="Contact type" className="w-32" value={contact.type} onChange={(event) => update(index, { type: event.target.value })} options={[{ value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }, { value: 'website', label: 'Website' }]} />
          <input aria-label="Contact value" className={cx(inputClass, 'flex-1')} value={contact.value} onChange={(event) => update(index, { value: event.target.value })} />
          <Button variant="ghost" className="h-9 px-2" aria-label="Remove contact" onClick={() => onChange(value.filter((_, i) => i !== index))}><Icon name="x" /></Button>
        </div>
      ))}
      <Button className="h-7 text-xs" onClick={() => onChange([...value, { type: 'phone', value: '' }])}>Add contact</Button>
    </div>
  );
}
