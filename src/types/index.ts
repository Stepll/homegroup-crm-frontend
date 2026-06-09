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
  customFields: CustomField[]
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
  oversightUserName?: string | null
  joinedAt?: string | null
  isFormer?: boolean
  leftAt?: string | null
}

export interface TimelineEvent {
  type: 'group_joined' | 'group_left' | 'status_change' | 'oversight_change'
  date: string
  groupId?: number | null
  groupName?: string | null
  groupColor?: string | null
  statusName?: string | null
  statusColor?: string | null
  oldStatusName?: string | null
  oldStatusColor?: string | null
  oversightName?: string | null
  oldOversightName?: string | null
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
  prevScheduledMeetingDate?: string
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
  stats: {
    avgAttendanceRate: number; prevAvgAttendanceRate: number
    newMembers: number; prevNewMembers: number
    totalMembers: number; prevTotalMembers: number
  }
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
  year?: number
  daysUntil: number
}

export interface GroupNeed {
  id: number
  subjectName: string
  description: string
  status: 'active' | 'answered' | 'irrelevant'
  createdAt: string
  personId?: number | null
  userId?: number | null
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
    avgAttendanceRate: number; prevAvgAttendanceRate: number
    meetingCount: number
    totalGuests: number
    newMembers: number; prevNewMembers: number
    totalMembers: number; prevTotalMembers: number
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

export interface AttendanceTableMeeting {
  date: string
  guestCount: number
  guestInfo: string | null
  notes: string | null
  isCancelled: boolean
  isInDb: boolean
}

export interface AttendanceTableMember {
  personId: number | null
  userId: number | null
  name: string
  lastName: string | null
  joinedAt: string
  leftAt?: string | null
  attendanceRate: number
  attendance: Record<string, boolean>
}

export interface AttendanceTableResponse {
  dates: string[]
  meetings: AttendanceTableMeeting[]
  members: AttendanceTableMember[]
}

export interface AdminTask {
  id: number
  title: string
  description?: string
  isCompleted: boolean
  createdByUserId?: number
  createdByName?: string
  createdAt: string
}

export interface PersonActivity {
  id: number
  type: 'comment' | 'status_change' | 'oversight_change' | 'person_converted'
  content?: string
  authorId?: number
  authorName?: string
  oldStatus?: { id: number; name: string; color: string } | null
  newStatus?: { id: number; name: string; color: string } | null
  oldValue?: string | null
  newValue?: string | null
  createdAt: string
}

// ─── Attendance Import/Export ──────────────────────────────────────────────────

export interface GroupOption {
  id: number
  name: string
}

export interface PersonMatchSuggestion {
  personId: number | null
  userId: number | null
  name: string
  lastName: string | null
  primaryGroupName: string | null
  isAdmin: boolean
}

export interface ImportPersonPreview {
  rowIndex: number
  name: string
  lastName: string | null
  fileIdHint: string | null
  matchedPersonId: number | null
  matchedUserId: number | null
  matchType: 'by_id' | 'by_name' | 'unmatched'
  suggestions: PersonMatchSuggestion[]
  statusFromFile: string | null
  oversightFromFile: string | null
  joinedAtFromFile: string | null
  detectedLeftAt: string | null
  filePresentCount: number
  fileAbsentCount: number
}

export interface ImportDatePreview {
  colIndex: number
  date: string
  existedInDb: boolean
  fileCancelled: boolean
  dbCancelled: boolean | null
  fileGuests: number
  dbGuests: number | null
  fileNotes: string | null
  dbNotes: string | null
}

export interface ImportConflict {
  index: number
  type: 'attendance' | 'cancellation' | 'guests' | 'notes' | string
  date: string
  personRowIndex: number | null
  personName: string | null
  fileValue: string | null
  dbValue: string | null
}

export interface ImportChangesSummary {
  newAttendanceRecords: number
  updatedAttendanceRecords: number
  newMeetings: number
  cancelledMeetings: number
  newMetaRecords: number
  updatedMetaRecords: number
}

export interface ImportSheetPreview {
  sheetIndex: number
  sheetName: string
  matchedGroupId: number | null
  matchedGroupName: string | null
  dates: ImportDatePreview[]
  people: ImportPersonPreview[]
  conflicts: ImportConflict[]
  changes: ImportChangesSummary
}

export interface ImportPreviewResponse {
  importId: string
  expiresAt: string
  sheets: ImportSheetPreview[]
  availableGroups: GroupOption[]
}

export interface PersonDecision {
  rowIndex: number
  action: 'skip' | 'use' | 'create' | 'link'
  targetPersonId: number | null
  targetUserId: number | null
}

export interface ConflictResolution {
  type: string
  date: string
  personRowIndex: number | null
  useFile: boolean
}

export interface ImportSheetDecision {
  sheetIndex: number
  groupId: number | null
  personDecisions: PersonDecision[]
  conflictResolutions: ConflictResolution[]
  importStatus: boolean
  importOversight: boolean
  importJoinedAt: boolean
  importLeftAt: boolean
}

export interface ImportApplyRequest {
  importId: string
  sheets: ImportSheetDecision[]
}

export interface ImportApplyResponse {
  sheetsProcessed: number
  attendanceCreated: number
  attendanceUpdated: number
  metaCreated: number
  metaUpdated: number
  peopleCreated: number
  membershipsCreated: number
  membershipsLeft: number
}
