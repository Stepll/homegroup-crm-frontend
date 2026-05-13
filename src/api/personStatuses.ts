import { api } from './client'

export interface PersonStatus {
  id: number
  name: string
  color: string
}

export const personStatusesApi = {
  getAll: () => api.get<PersonStatus[]>('/person-statuses').then((r) => r.data),
  create: (data: { name: string; color: string }) => api.post<PersonStatus>('/person-statuses', data).then((r) => r.data),
  update: (id: number, data: { name: string; color: string }) => api.put<PersonStatus>(`/person-statuses/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/person-statuses/${id}`),
}
