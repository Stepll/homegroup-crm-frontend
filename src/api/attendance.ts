import { api } from './client'
import type { AttendanceRecord, AttendanceSummary } from '@/types'

export const attendanceApi = {
  getByGroup: (groupId: number, from?: string, to?: string) =>
    api.get<AttendanceRecord[]>('/attendance', { params: { groupId, from, to } }).then((r) => r.data),

  getSummary: (groupId: number) =>
    api.get<AttendanceSummary[]>('/attendance/summary', { params: { groupId } }).then((r) => r.data),

  record: (data: { homeGroupId: number; meetingDate: string; entries: { personId: number; wasPresent: boolean; notes?: string }[] }) =>
    api.post('/attendance', data),

  getMeta: (groupId: number, date: string) =>
    api.get<{ guestCount: number; guestInfo: string | null }>('/attendance/meta', { params: { groupId, date } }).then((r) => r.data),

  saveMeta: (data: { homeGroupId: number; meetingDate: string; guestCount: number; guestInfo?: string }) =>
    api.post('/attendance/meta', data),
}
