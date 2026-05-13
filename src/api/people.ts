import { api } from './client'
import type { Person, CustomField } from '@/types'

export const peopleApi = {
  getAll: (search?: string, noGroup?: boolean) =>
    api.get<Person[]>('/people', { params: { search, noGroup: noGroup || undefined } }).then((r) => r.data),

  getById: (id: number) =>
    api.get<Person>(`/people/${id}`).then((r) => r.data),

  create: (data: { name: string; lastName?: string; primaryGroupId?: number }) =>
    api.post<Person>('/people', data).then((r) => r.data),

  update: (id: number, data: {
    name: string; lastName?: string; phone?: string; email?: string
    notes?: string; personStatusId?: number | null; oversightInfo?: string; oversightUserId?: number | null
    dateOfBirth?: string; primaryGroupId?: number
  }) => api.put<Person>(`/people/${id}`, data).then((r) => r.data),

  remove: (id: number) => api.delete(`/people/${id}`),

  addCustomField: (personId: number, name: string) =>
    api.post<CustomField>(`/people/${personId}/custom-fields`, { name }).then((r) => r.data),

  updateCustomField: (personId: number, fieldId: number, value: string | undefined) =>
    api.put<CustomField>(`/people/${personId}/custom-fields/${fieldId}`, { value }).then((r) => r.data),

  deleteCustomField: (personId: number, fieldId: number) =>
    api.delete(`/people/${personId}/custom-fields/${fieldId}`),
}
