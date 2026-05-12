export interface AuthResponse {
  token: string
  name: string
  email: string
  role: string
}

export interface Person {
  id: number
  name: string
  phone?: string
  email?: string
  notes?: string
  status: string
  createdAt: string
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
