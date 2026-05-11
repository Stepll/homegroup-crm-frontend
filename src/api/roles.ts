import { api } from './client'

export interface Role {
  id: number
  name: string
  description?: string
  color: string
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  userCount: number
  createdAt: string
}

export interface RoleFormData {
  name: string
  description: string
  color: string
  permissions: string[]
  isDefault: boolean
}

export const rolesApi = {
  getAll: () => api.get<Role[]>('/roles').then((r) => r.data),
  getById: (id: number) => api.get<Role>(`/roles/${id}`).then((r) => r.data),
  create: (data: RoleFormData) => api.post<Role>('/roles', data).then((r) => r.data),
  update: (id: number, data: RoleFormData) => api.put<Role>(`/roles/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/roles/${id}`),
}
