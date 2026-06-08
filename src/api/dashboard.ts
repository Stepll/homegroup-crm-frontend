import { api } from './client'

export interface InactiveMember {
  personId: number | null
  userId: number | null
  fullName: string
  groupId: number | null
  groupName: string | null
  groupColor: string | null
  missedCount: number
  lastAttendedDate: string | null
}

export interface StatusDistributionItem {
  statusId: number | null
  name: string
  color: string
  count: number
}

export interface StatusDistributionResponse {
  totalPeople: number
  items: StatusDistributionItem[]
}

export interface GroupComparisonPoint {
  date: string
  attendanceRate: number
}

export interface GroupComparisonSeries {
  groupId: number
  groupName: string
  groupColor: string
  points: GroupComparisonPoint[]
}

export interface GroupAttendanceSummaryRow {
  groupId: number
  groupName: string
  groupColor: string
  totalMembers: number
  avg1m: number
  avg3m: number
  avg6m: number
}

export interface GroupsAttendanceSummaryResponse {
  groups: GroupAttendanceSummaryRow[]
  totalMembers: number
  avg1m: number
  avg3m: number
  avg6m: number
}

export type ComparisonPeriod = '1m' | '3m' | '6m'

export const dashboardApi = {
  inactiveMembers: (groupId?: number, minMissed = 5) =>
    api.get<InactiveMember[]>('/dashboard/inactive-members', {
      params: { groupId, minMissed },
    }).then((r) => r.data),

  statusDistribution: (groupId?: number) =>
    api.get<StatusDistributionResponse>('/dashboard/status-distribution', {
      params: { groupId },
    }).then((r) => r.data),

  groupsComparison: (groupIds: number[], period: ComparisonPeriod) =>
    api.get<GroupComparisonSeries[]>('/dashboard/groups-comparison', {
      params: { groupIds: groupIds.join(','), period },
    }).then((r) => r.data),

  groupsAttendanceSummary: () =>
    api.get<GroupsAttendanceSummaryResponse>('/dashboard/groups-attendance-summary').then((r) => r.data),
}
