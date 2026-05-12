import { api } from './client'
import type { Group, Person } from '@/types'

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
}
