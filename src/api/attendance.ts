import { api } from './client'
import type { AttendanceRecord, AttendanceSummary, AttendanceTableResponse } from '@/types'

export const attendanceApi = {
  getByGroup: (groupId: number, from?: string, to?: string) =>
    api.get<AttendanceRecord[]>('/attendance', { params: { groupId, from, to } }).then((r) => r.data),

  getSummary: (groupId: number) =>
    api.get<AttendanceSummary[]>('/attendance/summary', { params: { groupId } }).then((r) => r.data),

  record: (data: { homeGroupId: number; meetingDate: string; entries: { personId?: number; userId?: number; wasPresent: boolean; notes?: string }[] }) =>
    api.post('/attendance', data),

  recordBulk: (data: { homeGroupId: number; entries: { date: string; personId?: number; userId?: number; wasPresent: boolean }[] }) =>
    api.post('/attendance/bulk', data),

  getMeta: (groupId: number, date: string) =>
    api.get<{ guestCount: number; guestInfo: string | null; notes: string | null; isCancelled: boolean }>('/attendance/meta', { params: { groupId, date } }).then((r) => r.data),

  saveMeta: (data: { homeGroupId: number; meetingDate: string; guestCount: number; guestInfo?: string; notes?: string; isCancelled: boolean }) =>
    api.post('/attendance/meta', data),

  deleteMeeting: (groupId: number, date: string) =>
    api.delete('/attendance/meeting', { params: { groupId, date } }),

  getTable: (groupId: number) =>
    api.get<AttendanceTableResponse>(`/groups/${groupId}/attendance-table`).then((r) => r.data),
}
