import { Icon, type IconName } from '../../../components/ui/Icon';
import { type FacilityDetail, recordFacilityEvent } from '../api';

const icons: Record<string, IconName> = { phone: 'phone', email: 'mail', website: 'globe' };

function href(type: string, value: string): string {
  if (type === 'phone') {
    return `tel:${value.replace(/[^\d+]/g, '')}`;
  }
  if (type === 'email') {
    return `mailto:${value}`;
  }

  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

/** Public contacts as tap-to-call / email / website links. */
export function ContactList({ facilityId, contacts }: { facilityId: string; contacts: FacilityDetail['contacts'] }) {
  if (contacts.length === 0) {
    return <p className="text-sm text-zinc-500">No public contact details listed.</p>;
  }

  return (
    <ul className="space-y-2">
      {contacts.map((contact) => (
        <li key={`${contact.type}-${contact.value}`}>
          <a
            href={href(contact.type, contact.value)}
            target={contact.type === 'website' ? '_blank' : undefined}
            rel={contact.type === 'website' ? 'noreferrer' : undefined}
            onClick={() => contact.type === 'phone' && recordFacilityEvent(facilityId, 'call_click')}
            className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline dark:text-brand-500"
          >
            <Icon name={icons[contact.type] ?? 'globe'} className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            {contact.value}
          </a>
        </li>
      ))}
    </ul>
  );
}
