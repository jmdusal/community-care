import type { IconName } from '../components/ui/Icon';

/** The most recent roadmap phase whose screens are built. Screens from later phases show a placeholder. */
export const BUILT_PHASE = 8;

export type NavItem = {
  path: string;
  label: string;
  icon: IconName;
  /** Roadmap phase in which the screen is built (docs/roadmap.md). */
  phase: number;
  summary: string;
  /** Follows the facility / region picker in the top bar. */
  scoped?: boolean;
  /** Permissions that open it (any one; the API enforces them too). Omitted = every team member. */
  permissions?: string[];
};

export const primaryNav: NavItem[] = [
  { path: '/admin', label: 'Overview', icon: 'home', phase: 1, summary: 'Directory health and system status.', scoped: true },
  { path: '/admin/facilities', label: 'Facilities', icon: 'building', phase: 4, summary: 'Facility records with status tabs, filters and a detail panel.', scoped: true, permissions: ['facilities.view'] },
  { path: '/admin/review-queue', label: 'Review queue', icon: 'inbox', phase: 4, summary: 'Approve or reject change requests with four-eyes review.', scoped: true, permissions: ['facilities.edit', 'facilities.review'] },
  { path: '/admin/data-quality', label: 'Data quality', icon: 'check', phase: 8, summary: 'Missing or doubtful facility details to fix before the pilot.', scoped: true },
  { path: '/admin/imports', label: 'Imports', icon: 'database', phase: 2, summary: 'NHFR and PSGC batches through staging, matching and review.', permissions: ['imports.manage'] },
  { path: '/admin/locations', label: 'Locations', icon: 'pin', phase: 2, summary: 'The PSGC hierarchy with coverage per area.' },
  { path: '/admin/appointments', label: 'Appointments', icon: 'calendar', phase: 7, summary: 'Booking pilot: requests, confirmations and the facility schedule.', scoped: true, permissions: ['appointments.manage'] },
  { path: '/admin/patients', label: 'Patients', icon: 'user', phase: 8, summary: 'Patient accounts and their appointments.', scoped: true, permissions: ['patients.view'] },
  { path: '/admin/reports', label: 'Reports', icon: 'chart', phase: 8, summary: 'Appointments and directory use over time, with CSV export.', scoped: true, permissions: ['reports.view'] },
  { path: '/admin/assistant', label: 'AI assistant', icon: 'spark', phase: 6, summary: 'Test console, guardrails and evaluation results.', permissions: ['assistant.manage'] },
  { path: '/admin/health-programs', label: 'Health programs', icon: 'megaphone', phase: 7, summary: 'Public campaigns and participating facilities.', scoped: true, permissions: ['programs.manage'] },
];

export const workspaceNav: NavItem[] = [
  { path: '/admin/team', label: 'Team & roles', icon: 'users', phase: 4, summary: 'Members, invitations, roles and access review.', scoped: true, permissions: ['team.view'] },
  { path: '/admin/audit-log', label: 'Audit log', icon: 'list', phase: 4, summary: 'Every administrative change with redacted before/after values.', scoped: true, permissions: ['audit.view'] },
  { path: '/admin/catalog', label: 'Services & types', icon: 'tag', phase: 8, summary: 'The service and facility-type lists every facility chooses from.', permissions: ['catalog.manage'] },
  { path: '/admin/settings', label: 'Settings', icon: 'cog', phase: 3, summary: 'Verification thresholds, rate limits and feature switches.', permissions: ['settings.manage'] },
];

export const allNav = [...primaryNav, ...workspaceNav];

/** Navigation the signed-in person can actually use. */
export function visibleNav(items: NavItem[], userPermissions: string[] | undefined): NavItem[] {
  return items.filter((item) => !item.permissions || item.permissions.some((permission) => userPermissions?.includes(permission)));
}
