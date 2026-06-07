import { api } from './client'
import type {
  AttendanceRecord, AttendanceSummary, AttendanceTableResponse,
  ImportPreviewResponse, ImportApplyRequest, ImportApplyResponse,
} from '@/types'

export interface AttendanceDotsResponse {
  dates: string[]
  cancelledDates: string[]
  records: { personId?: number; userId?: number; date: string; wasPresent: boolean }[]
}

export const attendanceApi = {
  getByGroup: (groupId: number, from?: string, to?: string) =>
    api.get<AttendanceRecord[]>('/attendance', { params: { groupId, from, to } }).then((r) => r.data),

  getSummary: (groupId: number) =>
    api.get<AttendanceSummary[]>('/attendance/summary', { params: { groupId } }).then((r) => r.data),

  getMeetingDates: (groupId: number) =>
    api.get<string[]>('/attendance/dates', { params: { groupId } }).then((r) => r.data),

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

  getDots: (groupId: number, limit = 5) =>
    api.get<AttendanceDotsResponse>('/attendance/dots', { params: { groupId, limit } }).then((r) => r.data),

  export: (groupIds: number[], from?: string, to?: string) =>
    api.get('/attendance/export', {
      params: { groupIds: groupIds.join(','), from: from || undefined, to: to || undefined },
      responseType: 'blob',
    }).then((r) => r.data as Blob),

  template: (groupIds: number[], from?: string, to?: string) =>
    api.get('/attendance/template', {
      params: { groupIds: groupIds.join(','), from: from || undefined, to: to || undefined },
      responseType: 'blob',
    }).then((r) => r.data as Blob),

  importPreview: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<ImportPreviewResponse>('/attendance/import/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  importApply: (req: ImportApplyRequest) =>
    api.post<ImportApplyResponse>('/attendance/import/apply', req).then((r) => r.data),
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
