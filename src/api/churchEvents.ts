import { api } from './client'
import type { ChurchEvent } from '@/types'

export const churchEventsApi = {
  getAll: () => api.get<ChurchEvent[]>('/church-events').then((r) => r.data),

  add: (data: { name: string; month: number; day: number }) =>
    api.post<ChurchEvent>('/church-events', data).then((r) => r.data),

  delete: (id: number) => api.delete(`/church-events/${id}`),
}
