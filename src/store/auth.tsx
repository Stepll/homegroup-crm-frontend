import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AuthResponse } from '@/types'

interface AuthUser {
  name: string
  email: string
  role: string
  roles: string[]
  primaryGroupId?: number
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (data: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser)

  const login = (data: AuthResponse) => {
    const u: AuthUser = {
      name: data.name,
      email: data.email,
      role: data.role,
      roles: data.roles ?? [data.role].filter(Boolean),
      primaryGroupId: data.primaryGroupId,
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
