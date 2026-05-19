import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DashboardSettingsPage } from '@/pages/dashboard/DashboardSettingsPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { PeoplePage } from '@/pages/people/PeoplePage'
import { AttendancePage } from '@/pages/attendance/AttendancePage'
import { AttendanceTablePage } from '@/pages/attendance/AttendanceTablePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { AdminsPage } from '@/pages/admins/AdminsPage'
import { AdminDetailPage } from '@/pages/admins/AdminDetailPage'
import { AdminProfilePage } from '@/pages/admins/AdminProfilePage'
import { AdminCreatePage } from '@/pages/admins/AdminCreatePage'
import { RolesSettingsPage } from '@/pages/settings/RolesSettingsPage'
import { RoleFormPage } from '@/pages/settings/RoleFormPage'
import { HomeGroupsSettingsPage } from '@/pages/settings/HomeGroupsSettingsPage'
import { HomeGroupFormPage } from '@/pages/settings/HomeGroupFormPage'
import { PersonStatusesPage } from '@/pages/settings/PersonStatusesPage'
import { PersonStatusFormPage } from '@/pages/settings/PersonStatusFormPage'
import { RoomsSettingsPage } from '@/pages/settings/RoomsSettingsPage'
import { RoomFormPage } from '@/pages/settings/RoomFormPage'
import { PersonCreatePage } from '@/pages/people/PersonCreatePage'
import { PersonDetailPage } from '@/pages/people/PersonDetailPage'
import { PersonActivityPage } from '@/pages/people/PersonActivityPage'
import { GroupCabinetPage } from '@/pages/cabinet/GroupCabinetPage'
import { PlanningPage } from '@/pages/cabinet/PlanningPage'
import { StatsPage } from '@/pages/cabinet/StatsPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProtectedRoute permission="page.dashboard"><DashboardPage /></ProtectedRoute>} />
            <Route path="dashboard/settings" element={<ProtectedRoute permission="page.dashboard"><DashboardSettingsPage /></ProtectedRoute>} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="cabinet" element={<ProtectedRoute permission="page.cabinet"><GroupCabinetPage /></ProtectedRoute>} />
            <Route path="cabinet/:id" element={<ProtectedRoute permission="page.cabinet"><GroupCabinetPage /></ProtectedRoute>} />
            <Route path="cabinet/:id/attendance" element={<ProtectedRoute permission="attendance.view"><AttendancePage /></ProtectedRoute>} />
            <Route path="cabinet/:id/attendance-table" element={<ProtectedRoute permission="attendance.view"><AttendanceTablePage /></ProtectedRoute>} />
            <Route path="cabinet/:id/plan" element={<ProtectedRoute permission="planning.view"><PlanningPage /></ProtectedRoute>} />
            <Route path="cabinet/:id/stats" element={<ProtectedRoute permission="attendance.stats"><StatsPage /></ProtectedRoute>} />
            <Route path="calendar" element={<ProtectedRoute permission="page.calendar"><CalendarPage /></ProtectedRoute>} />
            <Route path="people" element={<ProtectedRoute permission="page.people"><PeoplePage /></ProtectedRoute>} />
            <Route path="people/new" element={<ProtectedRoute permission="people.create"><PersonCreatePage /></ProtectedRoute>} />
            <Route path="people/:id" element={<ProtectedRoute permission="people.view"><PersonDetailPage /></ProtectedRoute>} />
            <Route path="people/:id/activity" element={<ProtectedRoute permission="people.view"><PersonActivityPage /></ProtectedRoute>} />
            <Route path="admins/:id" element={<ProtectedRoute permission="admins.viewProfiles"><AdminProfilePage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute permission="page.settings"><SettingsPage /></ProtectedRoute>} />
            <Route path="settings/admins" element={<ProtectedRoute permission="settings.admins"><AdminsPage /></ProtectedRoute>} />
            <Route path="settings/admins/new" element={<ProtectedRoute permission="settings.admins"><AdminCreatePage /></ProtectedRoute>} />
            <Route path="settings/admins/:id" element={<ProtectedRoute permission="settings.admins"><AdminDetailPage /></ProtectedRoute>} />
            <Route path="settings/roles" element={<ProtectedRoute permission="settings.roles"><RolesSettingsPage /></ProtectedRoute>} />
            <Route path="settings/roles/:id" element={<ProtectedRoute permission="settings.roles"><RoleFormPage /></ProtectedRoute>} />
            <Route path="settings/home-groups" element={<ProtectedRoute permission="settings.groups"><HomeGroupsSettingsPage /></ProtectedRoute>} />
            <Route path="settings/home-groups/:id" element={<ProtectedRoute permission="settings.groups"><HomeGroupFormPage /></ProtectedRoute>} />
            <Route path="settings/person-statuses" element={<ProtectedRoute permission="settings.statuses"><PersonStatusesPage /></ProtectedRoute>} />
            <Route path="settings/person-statuses/:id" element={<ProtectedRoute permission="settings.statuses"><PersonStatusFormPage /></ProtectedRoute>} />
            <Route path="settings/rooms" element={<ProtectedRoute permission="settings.rooms"><RoomsSettingsPage /></ProtectedRoute>} />
            <Route path="settings/rooms/:id" element={<ProtectedRoute permission="settings.rooms"><RoomFormPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
