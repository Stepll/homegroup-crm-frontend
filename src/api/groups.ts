import { api } from './client'
import type { Group, GroupCabinet, GroupCustomField, GroupEvent, GroupNeed, GroupStats, GroupMember } from '@/types'

export const groupsApi = {
  getAll: () => api.get<Group[]>('/groups').then((r) => r.data),

  getById: (id: number) => api.get<Group>(`/groups/${id}`).then((r) => r.data),

  getMembers: (id: number) => api.get<GroupMember[]>(`/groups/${id}/members`).then((r) => r.data),

  create: (data: Omit<Group, 'id' | 'leaderName' | 'memberCount'>) =>
    api.post<Group>('/groups', data).then((r) => r.data),

  update: (id: number, data: Omit<Group, 'id' | 'leaderName' | 'memberCount'>) =>
    api.put<Group>(`/groups/${id}`, data).then((r) => r.data),

  addMember: (groupId: number, personId: number, role = 'Member') =>
    api.post(`/groups/${groupId}/members`, { personId, role }),

  syncMembers: (groupId: number, personIds: number[]) =>
    api.put(`/groups/${groupId}/members/sync`, { personIds }),

  removeMember: (groupId: number, personId: number) =>
    api.delete(`/groups/${groupId}/members/${personId}`),

  delete: (groupId: number) => api.delete(`/groups/${groupId}`),

  getCustomFields: (groupId: number) =>
    api.get<GroupCustomField[]>(`/groups/${groupId}/custom-fields`).then((r) => r.data),

  addCustomField: (groupId: number, name: string) =>
    api.post<GroupCustomField>(`/groups/${groupId}/custom-fields`, { name }).then((r) => r.data),

  deleteCustomField: (groupId: number, fieldId: number) =>
    api.delete(`/groups/${groupId}/custom-fields/${fieldId}`),

  getCabinet: (groupId: number) =>
    api.get<GroupCabinet>(`/groups/${groupId}/cabinet`).then((r) => r.data),

  getEvents: (groupId: number) =>
    api.get<GroupEvent[]>(`/groups/${groupId}/events`).then((r) => r.data),

  addEvent: (groupId: number, data: { name: string; month: number; day: number; year?: number }) =>
    api.post<GroupEvent>(`/groups/${groupId}/events`, data).then((r) => r.data),

  updateEvent: (groupId: number, eventId: number, data: { name: string; month: number; day: number; year?: number }) =>
    api.put<GroupEvent>(`/groups/${groupId}/events/${eventId}`, data).then((r) => r.data),

  deleteEvent: (groupId: number, eventId: number) =>
    api.delete(`/groups/${groupId}/events/${eventId}`),

  setNextMeetingDate: (groupId: number, date: string | null, oldDate?: string) =>
    api.put(`/groups/${groupId}/next-meeting`, { date, oldDate }),

  skipMeeting: (groupId: number) =>
    api.put<{ date: string }>(`/groups/${groupId}/skip-meeting`).then((r) => r.data),

  bookRoom: (groupId: number, data: { date: string; roomId: number | null; autoBook: boolean }) =>
    api.put(`/groups/${groupId}/book-room`, data),

  getStats: (groupId: number, period: '1m' | '3m' | '6m') =>
    api.get<GroupStats>(`/groups/${groupId}/stats`, { params: { period } }).then((r) => r.data),

  getStatsAll: (period: '1m' | '3m' | '6m') =>
    api.get<GroupStats>('/groups/stats/all', { params: { period } }).then((r) => r.data),

  getNotifSettings: (groupId: number) =>
    api.get<NotifSettings>(`/groups/${groupId}/notif-settings`).then((r) => r.data),

  updateNotifSettings: (groupId: number, data: NotifSettings) =>
    api.put<NotifSettings>(`/groups/${groupId}/notif-settings`, data).then((r) => r.data),

  getNeeds: (groupId: number) =>
    api.get<GroupNeed[]>(`/groups/${groupId}/needs`).then((r) => r.data),

  addNeed: (groupId: number, data: { subjectName: string; description: string; personId?: number | null; userId?: number | null }) =>
    api.post<GroupNeed>(`/groups/${groupId}/needs`, data).then((r) => r.data),

  updateNeed: (groupId: number, needId: number, data: { subjectName: string; description: string; status: string; personId?: number | null; userId?: number | null }) =>
    api.put<GroupNeed>(`/groups/${groupId}/needs/${needId}`, data).then((r) => r.data),

  deleteNeed: (groupId: number, needId: number) =>
    api.delete(`/groups/${groupId}/needs/${needId}`),
}

export interface NotifSettings {
  eventSevenDays: boolean
  eventDay: boolean
  conflict: boolean
  conflictResolved: boolean
  attendanceAsk: boolean
}
