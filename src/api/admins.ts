import { api } from './client'
import type { Admin } from '@/types'

export interface CreateAdminData {
  name: string
  lastName?: string
  email: string
  password: string
  roleIds: number[]
  primaryGroupId?: number
  visibleGroupIds: number[]
}

export interface UpdateAdminData {
  name: string
  lastName?: string
  email: string
  roleIds: number[]
  primaryGroupId?: number
  visibleGroupIds: number[]
}

export const adminsApi = {
  getAll: () => api.get<Admin[]>('/admins').then((r) => r.data),
  getById: (id: number) => api.get<Admin>(`/admins/${id}`).then((r) => r.data),
  create: (data: CreateAdminData) => api.post<Admin>('/admins', data).then((r) => r.data),
  update: (id: number, data: UpdateAdminData) => api.put<Admin>(`/admins/${id}`, data).then((r) => r.data),
  setPassword: (id: number, newPassword: string) => api.post(`/admins/${id}/set-password`, { newPassword }),
  remove: (id: number) => api.delete(`/admins/${id}`),
}
