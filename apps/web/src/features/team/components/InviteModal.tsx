import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Field, inputClass } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { ApiError } from '../../../lib/api';
import { type RoleName, useInvite, useRoles } from '../api';
import { FacilityMultiPicker, type PickedFacility } from '../../../components/shared/FacilityMultiPicker';
import { useScope } from '../../../lib/scope';
import { needsFacilities, RoleCheckboxes } from './RoleCheckboxes';

/** Invite a member by email; they set their own password from the link. */
export function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInvite();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<RoleName[]>(['facility_staff']);
  const roleDefs = useRoles().data?.data ?? [];
  const { scope } = useScope();
  // With one facility selected in the top bar, a new member starts assigned to it.
  const startingFacilities = (): PickedFacility[] => (scope.facilityId ? [{ id: scope.facilityId, name: scope.name ?? 'Selected facility' }] : []);
  const [facilities, setFacilities] = useState<PickedFacility[]>(startingFacilities);
  const error = invite.error instanceof ApiError ? invite.error : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate({ name, email, roles, facility_ids: facilities.map((facility) => facility.id) }, {
      onSuccess: () => {
        setName('');
        setEmail('');
        setFacilities(startingFacilities());
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a team member"
      description="They receive an email link to set a password. Invites expire after 60 minutes; send another if needed."
      footer={<><Button onClick={onClose}>Cancel</Button><Button type="submit" form="invite-form" variant="primary" disabled={invite.isPending || roles.length === 0}>Send invite</Button></>}
    >
      <form id="invite-form" onSubmit={submit} className="space-y-4">
        <Field label="Full name" error={error?.field('name')}><input required className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Email" error={error?.field('email')}><input type="email" required className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <RoleCheckboxes value={roles} onChange={setRoles} roles={roleDefs} />
        {needsFacilities(roles, roleDefs) && <FacilityMultiPicker value={facilities} onChange={setFacilities} scope={scope} />}
      </form>
    </Modal>
  );
}
