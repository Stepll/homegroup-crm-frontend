import { Navigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  permission?: string
}

export function ProtectedRoute({ children, permission }: Props) {
  const { isAuthenticated, hasPermission } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />
  return <>{children}</>
}
