import { api } from './client'
import type { Person } from '@/types'

export const peopleApi = {
  getAll: (search?: string) =>
    api.get<Person[]>('/people', { params: { search } }).then((r) => r.data),

  getById: (id: number) =>
    api.get<Person>(`/people/${id}`).then((r) => r.data),

  create: (data: { name: string; phone?: string; email?: string; notes?: string }) =>
    api.post<Person>('/people', data).then((r) => r.data),

  update: (id: number, data: { name: string; phone?: string; email?: string; notes?: string; status: string }) =>
    api.put<Person>(`/people/${id}`, data).then((r) => r.data),

  remove: (id: number) => api.delete(`/people/${id}`),
}
