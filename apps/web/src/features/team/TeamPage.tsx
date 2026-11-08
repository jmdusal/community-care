import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/PageHead';
import { Pagination } from '../../components/ui/Pagination';
import { Panel } from '../../components/ui/Panel';
import { Tabs } from '../../components/ui/Tabs';
import { ApiError } from '../../lib/api';
import { isNarrowed, scopeParams, useScope } from '../../lib/scope';
import { can, useMe } from '../auth/useAuth';
import { type Member, useMembers } from './api';
import { EditMemberPanel } from './components/EditMemberPanel';
import { InviteModal } from './components/InviteModal';
import { MemberTable } from './components/MemberTable';
import { RolesPanel } from './components/RolesPanel';

/** Team & roles: members, access review reminders, invites and the permission matrix. */
export function TeamPage() {
  const me = useMe();
  // Who may change whom is decided per member by the server (can_edit); nobody can give more access than they have.
  const canManage = can(me.data, 'team.manage');
  const { scope } = useScope();
  const [page, setPage] = useState(1);
  const members = useMembers(scopeParams(scope), page);
  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const review = members.data?.meta.access_review;

  if (members.error instanceof ApiError && members.error.status === 403) {
    return <Alert tone="warning">Only administrators and verifiers can view the team.</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHead title="Team & roles" description="Least-privilege access, enforced on the server by Laravel Policies and Gates.">
        {canManage && <Button variant="primary" onClick={() => setInviting(true)}><Icon name="users" /> Invite member</Button>}
      </PageHead>

      {!canManage && <Alert>You can view the team. Changing access needs the "Invite and edit team members" permission.</Alert>}
      {canManage && me.data?.sees_all_facilities === false && <Alert>You can invite and edit members at your facilities, with roles that do no more than yours.</Alert>}
      {isNarrowed(scope) && (
        <Alert>Showing staff assigned to {scope.name ?? 'the selected scope'}. Administrators and verifiers work across all facilities, so they appear only under "All facilities".</Alert>
      )}

      <Tabs label="Team sections" value={tab} onChange={setTab} items={[{ value: 'members', label: 'Members', count: members.data?.meta.total }, { value: 'roles', label: 'Roles & permissions' }]} />

      {tab === 'members' ? (
        <>
          {review && (review.inactive_45_days > 0 || review.without_mfa > 0) && (
            <Alert tone="warning">
              Access review: {review.inactive_45_days} active account(s) unused for 45+ days, {review.without_mfa} without two-factor authentication.
            </Alert>
          )}
          <Panel className="overflow-hidden">
            {members.data && <MemberTable members={members.data.data} canManage={canManage} onEdit={setEditing} />}
            {members.data && (
              <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <Pagination page={members.data.meta.page} lastPage={members.data.meta.last_page} total={members.data.meta.total} perPage={members.data.meta.per_page} onChange={setPage} noun="members" />
              </div>
            )}
          </Panel>
        </>
      ) : (
        <Panel className="overflow-hidden"><RolesPanel /></Panel>
      )}

      <InviteModal open={inviting} onClose={() => setInviting(false)} />
      <EditMemberPanel member={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
