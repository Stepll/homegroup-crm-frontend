import { api } from './client'
import type { AttendanceRecord, AttendanceSummary } from '@/types'

export const attendanceApi = {
  getByGroup: (groupId: number, from?: string, to?: string) =>
    api.get<AttendanceRecord[]>('/attendance', { params: { groupId, from, to } }).then((r) => r.data),

  getSummary: (groupId: number) =>
    api.get<AttendanceSummary[]>('/attendance/summary', { params: { groupId } }).then((r) => r.data),

  record: (data: { homeGroupId: number; meetingDate: string; entries: { personId: number; wasPresent: boolean; notes?: string }[] }) =>
    api.post('/attendance', data),
}
