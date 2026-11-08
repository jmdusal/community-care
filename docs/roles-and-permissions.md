# Roles and Permissions

[← Documentation index](README.md)

Authorization is enforced on the server with Laravel Policies and Gates. Frontend controls improve usability but are not security boundaries.

| Capability | Guest | Patient | Facility staff | Verifier | System admin |
|---|---|---|---|---|---|
| Search public facilities | Yes | Yes | Yes | Yes | Yes |
| View published programs | Yes | Yes | Yes | Yes | Yes |
| Manage own account | No | Yes | Yes | Yes | Yes |
| Request appointments | No | Yes | Optional | No | No |
| View own appointments | No | Yes | No | No | No |
| Manage assigned facility appointments | No | No | Yes | No | Optional |
| Edit assigned facility info | No | No | Limited | Review only | Yes |
| Verify facility records | No | No | No | Yes | Yes |
| Import datasets | No | No | No | Authorized | Yes |
| Manage roles | No | No | No | No | Yes |
| Access audit logs | No | No | Limited if needed | Limited | Authorized |

## Authorization rules

- Enforce record ownership and facility assignment (`facility_user`) on every protected request.
- A verifier does not automatically get access to patient appointment details.
- Editing and approval are separated (four-eyes review): the submitter of a change request can never approve it.
- Apply least privilege and run a quarterly access review of staff and admin accounts.
- Log sensitive administrative changes without copying private medical data into logs.

## Facility scope

- Admins and verifiers can view the dashboard for all facilities, one region, or one facility.
- Facility staff see only their assigned facilities; with a single assignment, the console opens directly on it.
- The selected scope is sent to the API as `facility_id` / `region_code` and checked by Policies on every call.

## As built (phase 4)

| Rule | Where it is enforced |
|---|---|
| Admins and verifiers see every facility; facility staff only `facility_user` assignments | `FacilityPolicy::view`, admin facility list query, `StatsController` |
| Every create/edit is a **change request**; nothing changes until approved | `ProposeFacilityChangeAction`, `CreateFacilityAction` |
| **Four-eyes:** the submitter can never approve (409 `conflict`) | `ApproveChangeRequestAction` |
| A request is refused if the record changed after it was made (409) | `ApproveChangeRequestAction` compares each field's "before" with a fresh snapshot |
| Re-verify, withdraw and restore: verifiers and admins | `FacilityPolicy::review` |
| Managing members: system admins; viewing the team: admins and verifiers | Gates `manage-users`, `view-team` |
| Admins cannot change their own roles or status (prevents lock-out) | `UpdateUserAccessAction` |
| Suspending revokes all tokens; suspended users cannot sign in | `UpdateUserAccessAction`, `LoginController` |
| Audit log: admins and verifiers | Gate `view-audit-log` |

Invitations create an `invited` account and email a set-password link (a password-reset token). The account becomes `active` when the password is set.

## As built (phase 8): Facility admin, and direct edits

- **Facility admin** (`facility_admin`): full control of their assigned facilities only.
  - **Can:** approve or reject staff edits (never their own), re-verify and publish, manage appointments and the schedule, opt the facility into booking, invite and edit facility staff at their facilities, and see those facilities' audit history, stats and data quality.
  - **Cannot:** create facilities, imports, settings, places sync, the AI assistant, or health programs. They cannot give any role other than facility staff, and a staff member's assignments at other facilities are kept.
  - **Must use two-factor sign-in.**
- **System admins' facility edits go live at once.** The change is still recorded (as a change request approved by the same person) and audited as `facility.approved`. Every other role keeps four-eyes review.
- The console hides screens a role cannot open. The API enforces the same rules, and `RouteProtectionTest` and `FacilityAdminRoleTest` cover them.

## Editable roles and permissions

Roles are now data, not code. Open **Team & roles → Roles & permissions**.

- **A role is a set of permissions plus where it applies:**
  - **All facilities**, like system admins and verifiers.
  - **Assigned facilities only**, like facility admins and staff. Members see and act only on the facilities they are assigned to.
- **Permissions are fixed in code** (`App\Domain\Identity\Enums\Permission`). Each one guards real endpoints:
  - **Facilities:** view, propose edits, add, approve/re-verify, edits go live without review.
  - **Appointments & patients:** handle appointments, turn booking on, view patients, suspend patients.
  - **Programs, data & reports:** health programs, imports and places sync, AI assistant, reports.
  - **Administration:** audit log, view team, manage team, services & types, settings, roles.
- **System-wide permissions only work on an all-facilities role.** These are add facilities, edits go live, suspend patients, programs, imports, assistant, services & types, settings and roles. The API refuses them on an assigned role.
- **Built-in roles start from the defaults below and can be edited.** They cannot be deleted. The **system admin** always has everything and cannot be edited, so there is always someone who can fix access. **Patient** has no console access.
- **Custom roles** (for example "Data encoder") can be created, edited and deleted. A role can only be deleted once nobody has it.
- **Each role can require two-factor sign-in.** This applies while `security.require_mfa_for_staff` is on.
- **No escalation.** You can only create roles with permissions you have, and only give members roles that do no more than your own. People who manage the team only at their assigned facilities can give only assigned-facility roles, at their own facilities.
  - Change from before: a facility admin can now also invite another facility admin at their own facilities, since that role does no more than theirs.
- **Audit:** every change is logged as `role.created`, `role.updated` or `role.deleted`.

### Starting defaults

**System admin** (all facilities, two-factor required): every permission.

**Verifier** (all facilities, two-factor required):
- Facilities: view, propose edits, add, approve and re-verify.
- Health programs, imports and the AI assistant.
- Reports, the audit log, and viewing the team.

**Facility admin** (assigned facilities, two-factor required):
- Facilities: view, propose edits, approve and re-verify.
- Appointments, turning booking on, and viewing patients.
- Reports, the audit log, and viewing and managing the team.

**Facility staff** (assigned facilities, two-factor not required):
- Facilities: view and propose edits.
- Appointments, and viewing patients.

`GET /api/v1/me` returns `permissions`, `sees_all_facilities` and `is_team_member`. The web console shows screens and buttons from these, and the API checks them again on every request (`RoleTest`, `RouteProtectionTest`).
