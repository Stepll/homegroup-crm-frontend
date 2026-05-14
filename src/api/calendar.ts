import { api } from './client'
import type { CalendarOccurrence, CalendarEvent, Room } from '@/types'

export interface CalendarEventPayload {
  title: string
  description?: string | null
  location?: string | null
  roomId?: number | null
  type: string
  homeGroupId?: number | null
  isRecurring: boolean
  recurringDayOfWeek?: number | null
  startTime?: string | null
  endTime?: string | null
  date?: string | null
}

export const calendarApi = {
  getOccurrences: (params: { from: string; to: string; types?: string; groupIds?: string }) =>
    api.get<CalendarOccurrence[]>('/calendar', { params }).then((r) => r.data),

  getEvent: (id: number) =>
    api.get<CalendarEvent>(`/calendar/events/${id}`).then((r) => r.data),

  create: (data: CalendarEventPayload) =>
    api.post<CalendarEvent>('/calendar/events', data).then((r) => r.data),

  update: (id: number, data: CalendarEventPayload) =>
    api.put<CalendarEvent>(`/calendar/events/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/calendar/events/${id}`),
}

export const roomsApi = {
  getAll: () => api.get<Room[]>('/rooms').then((r) => r.data),
}
