import { api } from './client'
import type { Group, GroupCabinet, GroupCustomField, GroupEvent, Person } from '@/types'

export const groupsApi = {
  getAll: () => api.get<Group[]>('/groups').then((r) => r.data),

  getById: (id: number) => api.get<Group>(`/groups/${id}`).then((r) => r.data),

  getMembers: (id: number) => api.get<Person[]>(`/groups/${id}/members`).then((r) => r.data),

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

  deleteEvent: (groupId: number, eventId: number) =>
    api.delete(`/groups/${groupId}/events/${eventId}`),

  setNextMeetingDate: (groupId: number, date: string | null) =>
    api.put(`/groups/${groupId}/next-meeting`, { date }),
}
