import { api } from './client'

export type ScheduleStatus = 'default' | 'cancelled' | 'rescheduled_internal' | 'moved_in' | 'moved_out'

export interface ScheduleWeek {
  weekStart: string         // yyyy-MM-dd (Monday)
  defaultDate: string       // default meeting date this week
  effectiveDate: string | null  // actual meeting date (null = cancelled / moved out)
  status: ScheduleStatus
  movedFromDate?: string | null
  movedToDate?: string | null
  hasPlan: boolean
  attendanceRecordCount: number
}

export const scheduleApi = {
  getWeeks: (groupId: number, from: string, to: string) =>
    api.get<ScheduleWeek[]>(`/groups/${groupId}/schedule`, { params: { from, to } }).then((r) => r.data),

  cancel: (groupId: number, date: string) =>
    api.post(`/groups/${groupId}/schedule/cancel`, { date }),

  uncancel: (groupId: number, date: string) =>
    api.delete(`/groups/${groupId}/schedule/cancel`, { params: { date } }),

  move: (groupId: number, fromDate: string, toDate: string, movePlan: boolean) =>
    api.post(`/groups/${groupId}/schedule/move`, { fromDate, toDate, movePlan }),

  resetWeek: (groupId: number, weekStart: string, restorePlan: boolean) =>
    api.post(`/groups/${groupId}/schedule/reset-week`, { weekStart, restorePlan }),
}
