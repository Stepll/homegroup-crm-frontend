import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AdminsPage } from '@/pages/admins/AdminsPage'
import { PeoplePage } from '@/pages/people/PeoplePage'
import { GroupsPage } from '@/pages/groups/GroupsPage'
import { GroupDetailPage } from '@/pages/groups/GroupDetailPage'
import { AttendancePage } from '@/pages/attendance/AttendancePage'

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
            <Route path="admins" element={<AdminsPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="groups/:id" element={<GroupDetailPage />} />
            <Route path="groups/:id/attendance" element={<AttendancePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
