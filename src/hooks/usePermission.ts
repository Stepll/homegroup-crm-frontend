import { useAuth } from '@/store/auth'

export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { hasPermission } = useAuth()
  return Object.fromEntries(permissions.map((p) => [p, hasPermission(p)]))
}
