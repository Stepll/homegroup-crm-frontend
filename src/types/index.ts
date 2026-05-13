export interface AuthResponse {
  token: string
  name: string
  email: string
  role: string
  roles: string[]
  primaryGroupId?: number
}

export interface Person {
  id: number
  name: string
  lastName?: string
  phone?: string
  email?: string
  notes?: string
  status: string
  oversightInfo?: string
  oversightUserId?: number
  oversightUserName?: string
  dateOfBirth?: string
  primaryGroupId?: number
  primaryGroupName?: string
  primaryGroupColor?: string
  createdAt: string
  customFields?: CustomField[]
}

export interface CustomField {
  id: number
  name: string
  value?: string
}

export interface GroupCustomField {
  id: number
  name: string
}

export interface Group {
  id: number
  name: string
  description?: string
  color: string
  meetingDay?: string
  meetingTime?: string
  location?: string
  leaderId?: number
  leaderName?: string
  isActive: boolean
  memberCount: number
}

export interface RoleTag {
  id: number
  name: string
  color: string
}

export interface GroupTag {
  id: number
  name: string
  color: string
}

export interface Admin {
  id: number
  name: string
  lastName?: string
  email: string
  roles: RoleTag[]
  primaryGroupId?: number
  primaryGroupName?: string
  primaryGroupColor?: string
  visibleGroups: GroupTag[]
  createdAt: string
}

export interface GroupCabinet {
  group: {
    id: number
    name: string
    color: string
    meetingDay?: string
    meetingTime?: string
    location?: string
  }
  nextMeetingDate?: string
  lastMeetingDate?: string
  lastAttendance?: { present: number; total: number }
  upcomingEvents: { personId: number; fullName: string; dateOfBirth: string; daysUntil: number }[]
  orgTeam: {
    id: number
    name: string
    lastName?: string
    email: string
    overseeCount: number
    oversees: { id: number; fullName: string }[]
  }[]
  stats: { avgAttendanceRate: number; newMembersThisMonth: number; totalMembers: number }
}

export interface GroupEvent {
  id: number
  name: string
  month: number
  day: number
  daysUntil: number
}

export interface ChurchEvent {
  id: number
  name: string
  month: number
  day: number
  daysUntil: number
}

export interface AttendanceRecord {
  id: number
  personId: number
  personName: string
  homeGroupId: number
  meetingDate: string
  wasPresent: boolean
  notes?: string
}

export interface AttendanceSummary {
  meetingDate: string
  totalMembers: number
  presentCount: number
  attendanceRate: number
}
