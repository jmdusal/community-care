<?php

namespace App\Domain\Identity\Enums;

/**
 * The built-in roles. Their permissions are the starting point and can be changed in
 * Team & roles (except the system admin, who always has everything, and the patient, who
 * has no console access). Admins can also create their own roles.
 */
enum RoleName: string
{
    case SystemAdmin = 'system_admin';
    case Verifier = 'verifier';
    case FacilityAdmin = 'facility_admin';
    case FacilityStaff = 'facility_staff';
    case Patient = 'patient';

    public function label(): string
    {
        return match ($this) {
            self::SystemAdmin => 'System admin',
            self::Verifier => 'Verifier',
            self::FacilityAdmin => 'Facility admin',
            self::FacilityStaff => 'Facility staff',
            self::Patient => 'Patient',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::SystemAdmin => 'Everything, everywhere. Their facility edits go live at once.',
            self::Verifier => 'Reviews and verifies facilities everywhere; imports data.',
            self::FacilityAdmin => 'Full control of their assigned facilities, including their staff.',
            self::FacilityStaff => 'Updates their assigned facilities; edits need approval.',
            self::Patient => 'Requests and tracks their own appointments.',
        };
    }

    public function scope(): RoleScope
    {
        return match ($this) {
            self::SystemAdmin, self::Verifier => RoleScope::All,
            self::FacilityAdmin, self::FacilityStaff => RoleScope::Assigned,
            self::Patient => RoleScope::None,
        };
    }

    /** System admin and patient cannot be edited: there must always be someone who can do everything. */
    public function isLocked(): bool
    {
        return $this === self::SystemAdmin || $this === self::Patient;
    }

    public function requiresTwoFactor(): bool
    {
        return in_array($this, [self::SystemAdmin, self::Verifier, self::FacilityAdmin], true);
    }

    /** @return list<Permission> */
    public function defaultPermissions(): array
    {
        return match ($this) {
            self::SystemAdmin => Permission::cases(),
            self::Verifier => [
                Permission::FacilitiesView, Permission::FacilitiesEdit, Permission::FacilitiesCreate, Permission::FacilitiesReview,
                Permission::ProgramsManage, Permission::ImportsManage, Permission::AssistantManage,
                Permission::ReportsView, Permission::AuditView, Permission::TeamView,
            ],
            self::FacilityAdmin => [
                Permission::FacilitiesView, Permission::FacilitiesEdit, Permission::FacilitiesReview,
                Permission::AppointmentsManage, Permission::BookingEnable, Permission::PatientsView,
                Permission::ReportsView, Permission::AuditView, Permission::TeamView, Permission::TeamManage,
            ],
            self::FacilityStaff => [Permission::FacilitiesView, Permission::FacilitiesEdit, Permission::AppointmentsManage, Permission::PatientsView],
            self::Patient => [],
        };
    }
}
