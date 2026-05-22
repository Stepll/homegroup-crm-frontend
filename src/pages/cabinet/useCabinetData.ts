import { useEffect, useMemo, useState } from 'react'
import { groupsApi } from '@/api/groups'
import type { NotifSettings } from '@/api/groups'
import { planningApi } from '@/api/planning'
import { roomsApi } from '@/api/calendar'
import type { GroupCabinet, GroupEvent, GroupMember, GroupNeed, Room } from '@/types'

export function useCabinetData(groupId: number) {
  const [cabinet, setCabinet] = useState<GroupCabinet | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [needs, setNeeds] = useState<GroupNeed[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null)

  const load = async () => {
    try {
      const [cab, evts, rms, notif, nds, mbs] = await Promise.all([
        groupsApi.getCabinet(groupId),
        groupsApi.getEvents(groupId),
        roomsApi.getAll(),
        groupsApi.getNotifSettings(groupId).catch(() => null),
        groupsApi.getNeeds(groupId),
        groupsApi.getMembers(groupId),
      ])
      setCabinet(cab)
      setEvents(evts)
      setRooms(rms)
      setNotifSettings(notif)
      setNeeds(nds)
      setMembers(mbs)
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

  const reschedule = async (date: string, oldDate?: string, time?: string) => {
    await groupsApi.setNextMeetingDate(groupId, date, oldDate, time)
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

  const updateNotifSettings = async (settings: NotifSettings) => {
    const updated = await groupsApi.updateNotifSettings(groupId, settings)
    setNotifSettings(updated)
  }

  const addNeed = async (subjectName: string, description: string, personId?: number | null, userId?: number | null) => {
    const need = await groupsApi.addNeed(groupId, { subjectName, description, personId, userId })
    setNeeds((prev) => [need, ...prev])
  }

  const updateNeed = async (id: number, subjectName: string, description: string, status: string, personId?: number | null, userId?: number | null) => {
    const updated = await groupsApi.updateNeed(groupId, id, { subjectName, description, status, personId, userId })
    setNeeds((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
  }

  const deleteNeed = async (id: number) => {
    await groupsApi.deleteNeed(groupId, id)
    setNeeds((prev) => prev.filter((n) => n.id !== id))
  }

  const setMemberJoinedAt = async (personId: number | null, userId: number | null, date: string) => {
    await groupsApi.setMemberJoinedAt(groupId, { personId, userId, joinedAt: date })
    setMembers((prev) => prev.map((m) => {
      if (personId !== null && !m.isAdmin && m.id === personId) return { ...m, joinedAt: date }
      if (userId !== null && m.isAdmin && m.userId === userId) return { ...m, joinedAt: date }
      return m
    }))
  }

  const setMemberLeftAt = async (personId: number | null, userId: number | null, date: string) => {
    await groupsApi.setMemberLeftAt(groupId, { personId, userId, leftAt: date })
    setMembers((prev) => prev.map((m) => {
      if (personId !== null && !m.isAdmin && m.id === personId) return { ...m, leftAt: date }
      if (userId !== null && m.isAdmin && m.userId === userId) return { ...m, leftAt: date }
      return m
    }))
  }

  const transferMember = async (personId: number | null, userId: number | null, toGroupId: number) => {
    await groupsApi.transferMember(groupId, { personId, userId, toGroupId })
    // Reload to reflect the member moving groups
    await load()
  }

  const removeMemberFromGroup = async (personId: number | null, userId: number | null) => {
    if (personId !== null) await groupsApi.removeMember(groupId, personId)
    // For admins there's no separate remove endpoint — transfer handles it; but direct removal isn't a common flow
    setMembers((prev) => prev.map((m) => {
      if (personId !== null && !m.isAdmin && m.id === personId) return { ...m, isFormer: true, leftAt: new Date().toISOString() }
      return m
    }))
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
    needs,
    members,
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
    notifSettings,
    updateNotifSettings,
    addNeed,
    updateNeed,
    deleteNeed,
    setMemberJoinedAt,
    setMemberLeftAt,
    transferMember,
    removeMemberFromGroup,
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
