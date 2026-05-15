export interface AuthResponse {
  token: string
  name: string
  email: string
  role: string
  roles: string[]
  primaryGroupId?: number
  permissions: string[]
}

export interface Person {
  id: number
  name: string
  lastName?: string
  phone?: string
  email?: string
  telegram?: string
  notes?: string
  gender?: string
  maritalStatus?: string
  address?: string
  dateOfBirth?: string
  isBaptized: boolean
  church?: string
  ministry?: string
  isBaptizedWithSpirit: boolean
  status?: { id: number; name: string; color: string } | null
  oversightInfo?: string
  oversightUserId?: number
  oversightUserName?: string
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
  meetingEndTime?: string
  location?: string
  leaderId?: number
  leaderName?: string
  isActive: boolean
  memberCount: number
  telegramGroupId?: string
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
  // Profile fields
  phone?: string
  telegram?: string
  notes?: string
  gender?: string
  maritalStatus?: string
  address?: string
  dateOfBirth?: string
  isBaptized: boolean
  church?: string
  ministry?: string
  isBaptizedWithSpirit: boolean
  status?: { id: number; name: string; color: string } | null
}

export interface GroupMember {
  id: number
  name: string
  lastName?: string
  phone?: string
  email?: string
  notes?: string
  status?: { id: number; name: string; color: string } | null
  primaryGroupId?: number
  primaryGroupName?: string
  primaryGroupColor?: string
  createdAt: string
  isAdmin: boolean
  userId?: number
  roleTag?: { name: string; color: string } | null
}

export interface CabinetCalendarEvent {
  eventId: number
  title: string
  type: string
  startTime?: string
  endTime?: string
  roomId?: number
  roomColor?: string
  homeGroupColor?: string
}

export interface GroupCabinet {
  group: {
    id: number
    name: string
    color: string
    meetingDay?: string
    meetingTime?: string
    meetingEndTime?: string
    location?: string
    telegramGroupId?: string
    autoBookRoomId?: number
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
    role?: { name: string; color: string }
  }[]
  stats: { avgAttendanceRate: number; newMembersThisMonth: number; totalMembers: number }
  hasPlanForNextMeeting: boolean
  nextMeetingRoomId?: number
  nextMeetingEvents?: CabinetCalendarEvent[]
  nextMeetingConflicts?: CabinetCalendarEvent[]
  autoBookEnabled: boolean
}

export interface GroupEvent {
  id: number
  name: string
  month: number
  day: number
  daysUntil: number
}

export interface CalendarOccurrence {
  eventId: number
  title: string
  description?: string
  location?: string
  roomId?: number
  room?: { id: number; name: string }
  type: 'Recurring' | 'Global' | 'HomeGroup' | 'Google'
  homeGroupId?: number
  homeGroupName?: string
  homeGroupColor?: string
  date: string
  startTime?: string
  endTime?: string
  isGhost?: boolean
}

export interface CalendarEvent {
  id: number
  title: string
  description?: string
  location?: string
  roomId?: number
  room?: { id: number; name: string }
  type: 'Recurring' | 'Global' | 'HomeGroup' | 'Google'
  homeGroupId?: number
  homeGroupName?: string
  homeGroupColor?: string
  isRecurring: boolean
  recurringDayOfWeek?: number
  startTime?: string
  endTime?: string
  date?: string
  isHomeGroupMeeting?: boolean | null
}

export interface Room {
  id: number
  name: string
  building: string // 'Church' | 'SocialCenter'
  floor: number
  color: string
}

export interface PlanBlock {
  id?: number
  order: number
  time: string
  title: string
  info: string
  responsible: string
}

export interface MeetingPlan {
  id: number
  homeGroupId: number
  meetingDate: string
  appliedTemplateName?: string
  blocks: PlanBlock[]
  updatedAt: string
}

export interface MeetingPlanSummary {
  id: number
  meetingDate: string
  blockCount: number
  appliedTemplateName?: string
}

export interface PlanTemplate {
  id: number
  name: string
  blocks: Omit<PlanBlock, 'id'>[]
  createdAt: string
}

export interface GroupStats {
  summary: {
    avgAttendanceRate: number
    meetingCount: number
    totalGuests: number
    newMembers: number
  }
  meetings: {
    date: string
    presentCount: number
    totalMembers: number
    attendanceRate: number
    guestCount: number
    absentees: string[]
  }[]
  personStats: {
    personId?: number
    userId?: number
    fullName: string
    presentCount: number
    totalMeetings: number
    attendanceRate: number
  }[]
}

export interface AttendanceRecord {
  id: number
  personId?: number
  userId?: number
  memberName: string
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
