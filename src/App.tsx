import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { PeoplePage } from '@/pages/people/PeoplePage'
import { AttendancePage } from '@/pages/attendance/AttendancePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { AdminsPage } from '@/pages/admins/AdminsPage'
import { AdminDetailPage } from '@/pages/admins/AdminDetailPage'
import { AdminCreatePage } from '@/pages/admins/AdminCreatePage'
import { RolesSettingsPage } from '@/pages/settings/RolesSettingsPage'
import { RoleFormPage } from '@/pages/settings/RoleFormPage'
import { HomeGroupsSettingsPage } from '@/pages/settings/HomeGroupsSettingsPage'
import { HomeGroupFormPage } from '@/pages/settings/HomeGroupFormPage'
import { PersonCreatePage } from '@/pages/people/PersonCreatePage'
import { PersonDetailPage } from '@/pages/people/PersonDetailPage'
import { GroupCabinetPage } from '@/pages/cabinet/GroupCabinetPage'
import { PlanningPage } from '@/pages/cabinet/PlanningPage'
import { StatsPage } from '@/pages/cabinet/StatsPage'

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
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="cabinet" element={<GroupCabinetPage />} />
            <Route path="cabinet/:id" element={<GroupCabinetPage />} />
            <Route path="cabinet/:id/attendance" element={<AttendancePage />} />
            <Route path="cabinet/:id/plan" element={<PlanningPage />} />
            <Route path="cabinet/:id/stats" element={<StatsPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/new" element={<PersonCreatePage />} />
            <Route path="people/:id" element={<PersonDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/admins" element={<AdminsPage />} />
            <Route path="settings/admins/new" element={<AdminCreatePage />} />
            <Route path="settings/admins/:id" element={<AdminDetailPage />} />
            <Route path="settings/roles" element={<RolesSettingsPage />} />
            <Route path="settings/roles/:id" element={<RoleFormPage />} />
            <Route path="settings/home-groups" element={<HomeGroupsSettingsPage />} />
            <Route path="settings/home-groups/:id" element={<HomeGroupFormPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
