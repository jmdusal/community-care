import type { ReactElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { OverviewPage } from '../features/admin-overview/OverviewPage';
import { AccountSecurityPage } from '../features/account/AccountSecurityPage';
import { AiAssistantPage } from '../features/ai-assistant/AiAssistantPage';
import { AppointmentsPage } from '../features/appointments/AppointmentsPage';
import { AssistantPage } from '../features/assistant/AssistantPage';
import { AuditLogPage } from '../features/audit-log/AuditLogPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { FacilityPage } from '../features/directory/pages/FacilityPage';
import { SearchPage } from '../features/directory/pages/SearchPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { DataQualityPage } from '../features/data-quality/DataQualityPage';
import { FacilitiesPage } from '../features/facilities/FacilitiesPage';
import { HealthProgramsPage } from '../features/health-programs/HealthProgramsPage';
import { ImportsPage } from '../features/imports/ImportsPage';
import { LocationsPage } from '../features/locations/LocationsPage';
import { MyAppointmentsPage } from '../features/patient-account/MyAppointmentsPage';
import { RegisterPage } from '../features/patient-account/RegisterPage';
import { SignInPage } from '../features/patient-account/SignInPage';
import { ManageBookingPage } from '../features/patient-account/ManageBookingPage';
import { ProfilePage } from '../features/patient-account/ProfilePage';
import { QueueDisplayPage } from '../features/queue-display/QueueDisplayPage';
import { ComingSoonPage } from '../features/placeholder/ComingSoonPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { PatientsPage } from '../features/patients/PatientsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ProgramPage } from '../features/programs/ProgramPage';
import { ProgramsPage } from '../features/programs/ProgramsPage';
import { ReviewQueuePage } from '../features/review-queue/ReviewQueuePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TeamPage } from '../features/team/TeamPage';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { RouteError } from './RouteError';
import { allNav, BUILT_PHASE } from './navigation';

/** Screens that are built, by path. Everything else in the nav shows its phase placeholder. */
const screens: Record<string, ReactElement> = {
  '/admin/imports': <ImportsPage />,
  '/admin/locations': <LocationsPage />,
  '/admin/settings': <SettingsPage />,
  '/admin/facilities': <FacilitiesPage />,
  '/admin/review-queue': <ReviewQueuePage />,
  '/admin/team': <TeamPage />,
  '/admin/audit-log': <AuditLogPage />,
  '/admin/assistant': <AiAssistantPage />,
  '/admin/appointments': <AppointmentsPage />,
  '/admin/health-programs': <HealthProgramsPage />,
  '/admin/data-quality': <DataQualityPage />,
  '/admin/catalog': <CatalogPage />,
  '/admin/patients': <PatientsPage />,
  '/admin/reports': <ReportsPage />,
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <SearchPage /> },
      { path: 'facilities/:id', element: <FacilityPage /> },
      { path: 'assistant', element: <AssistantPage /> },
      { path: 'programs', element: <ProgramsPage /> },
      { path: 'programs/:id', element: <ProgramPage /> },
      { path: 'account/sign-in', element: <SignInPage /> },
      { path: 'account/register', element: <RegisterPage /> },
      { path: 'account/appointments', element: <MyAppointmentsPage /> },
      { path: 'account/profile', element: <ProfilePage /> },
      { path: 'appointments/manage', element: <ManageBookingPage /> },
    ],
  },
  // Full-screen "Now serving" board for a TV in the waiting area (no header, no sign-in).
  { path: '/display/:facilityId', element: <QueueDisplayPage />, errorElement: <RouteError /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/admin',
    errorElement: <RouteError />,
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'account', element: <AccountSecurityPage /> },
      ...allNav
        .filter((item) => item.path !== '/admin')
        .map((item) => ({
          path: item.path.replace('/admin/', ''),
          element: item.phase <= BUILT_PHASE && screens[item.path] ? screens[item.path] : <ComingSoonPage item={item} />,
        })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
