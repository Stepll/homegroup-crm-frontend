import { api } from './client'

export type ServiceType = 'sunday_1' | 'sunday_2' | 'vpb' | 'youth' | 'night_prayer'

export const SERVICE_TYPES: { key: ServiceType; label: string; shortLabel: string; hasCommunion: boolean }[] = [
  { key: 'sunday_1',    label: 'Недільне (1-е)',  shortLabel: 'Нд 1',  hasCommunion: true },
  { key: 'sunday_2',    label: 'Недільне (2-е)',  shortLabel: 'Нд 2',  hasCommunion: true },
  { key: 'vpb',         label: 'ВПБ',             shortLabel: 'ВПБ',   hasCommunion: false },
  { key: 'youth',       label: 'Молодіжка',       shortLabel: 'Молод', hasCommunion: false },
  { key: 'night_prayer', label: 'Нічна молитва',  shortLabel: 'Нічна', hasCommunion: false },
]

export interface ChurchServiceRecord {
  id: number
  serviceType: ServiceType
  date: string
  attendanceCount: number
  communionCount: number | null
  notes: string | null
  createdByUserId: number | null
  createdAt: string
}

export interface CreateChurchServiceRecordRequest {
  serviceType: ServiceType
  date: string
  attendanceCount: number
  communionCount?: number | null
  notes?: string | null
}

export interface UpdateChurchServiceRecordRequest {
  attendanceCount: number
  communionCount?: number | null
  notes?: string | null
}

export interface MonthlyStatPoint {
  month: string
  totalAttendance: number
  totalCommunion: number | null
  recordCount: number
}

export interface YearOverYearPoint {
  year: number
  month: number
  totalAttendance: number
  totalCommunion: number | null
}

export interface ChurchServiceStats {
  monthly: MonthlyStatPoint[]
  yearOverYear: YearOverYearPoint[]
}

export const churchServicesApi = {
  getAll: (params?: { type?: ServiceType; from?: string; to?: string }) =>
    api.get<ChurchServiceRecord[]>('/church-services', { params }).then((r) => r.data),

  create: (data: CreateChurchServiceRecordRequest) =>
    api.post<ChurchServiceRecord>('/church-services', data).then((r) => r.data),

  update: (id: number, data: UpdateChurchServiceRecordRequest) =>
    api.put<ChurchServiceRecord>(`/church-services/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/church-services/${id}`),

  getStats: (params?: { type?: ServiceType; from?: string; to?: string }) =>
    api.get<ChurchServiceStats>('/church-services/stats', { params }).then((r) => r.data),

  export: (params?: { type?: ServiceType; from?: string; to?: string }) =>
    api.get('/church-services/export', { params, responseType: 'blob' }).then((r) => r.data as Blob),
}
