import type { CalendarOccurrence } from '@/types'

export const HOUR_HEIGHT = 48
export const PX_PER_MIN = HOUR_HEIGHT / 60
export const TIME_AXIS_WIDTH = 44
export const HOURS = Array.from({ length: 24 }, (_, i) => i)

export const DAY_ABBR = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const UKR_MONTHS_SHORT = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру']
export const UKR_DAYS_FULL = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота']

export const TYPE_COLORS: Record<string, string> = {
  Recurring: '#2AAFCA',
  Global: '#F59E0B',
  HomeGroup: '#8B5CF6',
  Google: '#10B981',
}
export const TYPE_LABELS: Record<string, string> = {
  Recurring: 'Повторювані',
  Global: 'Глобальні',
  HomeGroup: 'Домашки',
  Google: 'Google',
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function mondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

export function getDefaultSelectedDate(): Date {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const dow = t.getDay()
  if (dow === 0) { t.setDate(t.getDate() + 1); return t }
  if (dow === 6) { t.setDate(t.getDate() + 2); return t }
  return t
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b)
}

export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function eventColor(o: CalendarOccurrence): string {
  if (o.type === 'HomeGroup' && o.homeGroupColor) return o.homeGroupColor
  return TYPE_COLORS[o.type] ?? '#6B7280'
}

export type Laid = CalendarOccurrence & { lane: number; totalLanes: number }

export function layoutEvents(events: CalendarOccurrence[]): Laid[] {
  const laid: Laid[] = events.map((e) => ({ ...e, lane: 0, totalLanes: 1 }))
  const startOf = (e: CalendarOccurrence) => timeToMin(e.startTime ?? '00:00')
  const endOf = (e: CalendarOccurrence) => e.endTime ? timeToMin(e.endTime) : startOf(e) + 60

  for (let i = 0; i < laid.length; i++) {
    const used = new Set<number>()
    for (let j = 0; j < i; j++) {
      if (startOf(laid[j]) < endOf(laid[i]) && startOf(laid[i]) < endOf(laid[j]))
        used.add(laid[j].lane)
    }
    let lane = 0
    while (used.has(lane)) lane++
    laid[i].lane = lane
  }
  for (let i = 0; i < laid.length; i++) {
    let max = laid[i].lane
    for (let j = 0; j < laid.length; j++) {
      if (i !== j && startOf(laid[j]) < endOf(laid[i]) && startOf(laid[i]) < endOf(laid[j]))
        max = Math.max(max, laid[j].lane)
    }
    laid[i].totalLanes = max + 1
  }
  return laid
}
