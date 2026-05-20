import { useEffect, useMemo, useState } from 'react'
import { groupsApi } from '@/api/groups'
import { planningApi } from '@/api/planning'
import { roomsApi } from '@/api/calendar'
import type { GroupCabinet, GroupEvent, Room } from '@/types'

export function useCabinetData(groupId: number) {
  const [cabinet, setCabinet] = useState<GroupCabinet | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [cab, evts, rms] = await Promise.all([
        groupsApi.getCabinet(groupId),
        groupsApi.getEvents(groupId),
        roomsApi.getAll(),
      ])
      setCabinet(cab)
      setEvents(evts)
      setRooms(rms)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [groupId])

  const busyRoomIds = useMemo(() => {
    const ids = new Set<number>()
    ;(cabinet?.nextMeetingEvents ?? []).forEach((e) => { if (e.roomId) ids.add(e.roomId) })
    return ids
  }, [cabinet?.nextMeetingEvents])

  const addEvent = async (name: string, month: number, day: number) => {
    const evt = await groupsApi.addEvent(groupId, { name, month, day })
    setEvents((prev) => [...prev, evt].sort((a, b) => a.daysUntil - b.daysUntil))
  }

  const updateEvent = async (id: number, name: string, month: number, day: number, year: number) => {
    const updated = await groupsApi.updateEvent(groupId, id, { name, month, day, year })
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)).sort((a, b) => a.daysUntil - b.daysUntil)
    )
  }

  const deleteEvent = async (id: number) => {
    await groupsApi.deleteEvent(groupId, id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const reschedule = async (date: string, oldDate?: string) => {
    await groupsApi.setNextMeetingDate(groupId, date, oldDate)
    await load()
  }

  const skipMeeting = async (hasPlan: boolean, nextDate: string | undefined, deletePlanFn?: () => Promise<void>) => {
    if (hasPlan && nextDate && deletePlanFn) await deletePlanFn()
    await groupsApi.skipMeeting(groupId)
    await load()
  }

  const deletePlan = async (date: string) => {
    try { await planningApi.deletePlanByDate(groupId, date) } catch { /* ignore */ }
  }

  const bookRoom = async (date: string, roomId: number | null, autoBook: boolean) => {
    await groupsApi.bookRoom(groupId, { date, roomId, autoBook })
    await load()
  }

  const sendPlan = async (date: string) => {
    await planningApi.sendPlanToTelegram(groupId, date)
  }

  const saveGroupInfo = async (patch: {
    name: string
    meetingDay?: string
    meetingTime?: string
    meetingEndTime?: string
    location?: string
    telegramGroupId?: string
  }) => {
    const current = await groupsApi.getById(groupId)
    await groupsApi.update(groupId, { ...current, ...patch })
    await load()
  }

  return {
    cabinet,
    rooms,
    events,
    loading,
    reload: load,
    busyRoomIds,
    addEvent,
    updateEvent,
    deleteEvent,
    reschedule,
    skipMeeting,
    deletePlan,
    bookRoom,
    sendPlan,
    saveGroupInfo,
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

export const UKR_DAYS: Record<string, number> = {
  'Неділя': 0, 'Понеділок': 1, 'Вівторок': 2, 'Середа': 3,
  'Четвер': 4, "Пʼятниця": 5, "П'ятниця": 5, 'Субота': 6,
}

export function computePrevMeetingDate(meetingDay?: string): string | null {
  if (!meetingDay) return null
  const target = UKR_DAYS[meetingDay]
  if (target === undefined) return null
  const today = new Date()
  let daysAgo = (today.getDay() - target + 7) % 7
  if (daysAgo === 0) daysAgo = 7
  const d = new Date(today)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export function formatDateUk(iso?: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })
}

export function formatBirthday(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

export function formatEventDate(month: number, day: number) {
  return new Date(2000, month - 1, day).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}
