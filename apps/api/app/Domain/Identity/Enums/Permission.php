<?php

namespace App\Domain\Identity\Enums;

/**
 * What a role can do. Permissions are fixed in code (each one guards real endpoints);
 * roles are data: admins choose which permissions each role has, and whether the role
 * works across all facilities or only the facilities a member is assigned to.
 */
enum Permission: string
{
    case FacilitiesView = 'facilities.view';
    case FacilitiesEdit = 'facilities.edit';
    case FacilitiesCreate = 'facilities.create';
    case FacilitiesReview = 'facilities.review';
    case FacilitiesPublishDirectly = 'facilities.publish_directly';
    case AppointmentsManage = 'appointments.manage';
    case BookingEnable = 'booking.enable';
    case PatientsView = 'patients.view';
    case PatientsManage = 'patients.manage';
    case ProgramsManage = 'programs.manage';
    case ImportsManage = 'imports.manage';
    case AssistantManage = 'assistant.manage';
    case ReportsView = 'reports.view';
    case AuditView = 'audit.view';
    case TeamView = 'team.view';
    case TeamManage = 'team.manage';
    case CatalogManage = 'catalog.manage';
    case SettingsManage = 'settings.manage';
    case RolesManage = 'roles.manage';

    public function label(): string
    {
        return match ($this) {
            self::FacilitiesView => 'View facility records',
            self::FacilitiesEdit => 'Propose facility edits',
            self::FacilitiesCreate => 'Add new facilities',
            self::FacilitiesReview => 'Approve edits and re-verify facilities',
            self::FacilitiesPublishDirectly => 'Edits go live without review',
            self::AppointmentsManage => 'Handle appointments and schedules',
            self::BookingEnable => 'Turn online booking on or off',
            self::PatientsView => 'View patient details',
            self::PatientsManage => 'Suspend or reactivate patient accounts',
            self::ProgramsManage => 'Manage health programs',
            self::ImportsManage => 'Import datasets and sync places',
            self::AssistantManage => 'Manage the AI assistant',
            self::ReportsView => 'View reports and export CSV',
            self::AuditView => 'View the audit log',
            self::TeamView => 'View team members',
            self::TeamManage => 'Invite and edit team members',
            self::CatalogManage => 'Manage services and facility types',
            self::SettingsManage => 'Change system settings',
            self::RolesManage => 'Create and edit roles',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::FacilitiesView, self::FacilitiesEdit, self::FacilitiesCreate, self::FacilitiesReview, self::FacilitiesPublishDirectly => 'Facilities',
            self::AppointmentsManage, self::BookingEnable, self::PatientsView, self::PatientsManage => 'Appointments & patients',
            self::ProgramsManage, self::ImportsManage, self::AssistantManage, self::ReportsView => 'Programs, data & reports',
            self::AuditView, self::TeamView, self::TeamManage, self::CatalogManage, self::SettingsManage, self::RolesManage => 'Administration',
        };
    }

    /**
     * Works only with a role that covers all facilities: these act on the whole system,
     * not on one facility (an "assigned facilities" role cannot be given them).
     */
    public function needsAllFacilities(): bool
    {
        return in_array($this, [self::FacilitiesCreate, self::FacilitiesPublishDirectly, self::PatientsManage, self::ProgramsManage, self::ImportsManage, self::AssistantManage, self::CatalogManage, self::SettingsManage, self::RolesManage], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }
}
