import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import { attendanceApi, type AttendanceDotsResponse } from '@/api/attendance'
import { usePermission } from '@/hooks/usePermission'
import type { Group, GroupMember } from '@/types'

export type TagKey = 'role' | 'group' | 'status' | 'oversight' | 'attendance'
export interface TagItem { key: TagKey; enabled: boolean }

export const TAG_LABELS: Record<TagKey, string> = {
  role: 'Роль',
  group: 'Домашка',
  status: 'Статус',
  oversight: 'Опікун',
  attendance: 'Відвідуваність',
}

const DEFAULT_TAGS: TagItem[] = [
  { key: 'role', enabled: true },
  { key: 'group', enabled: true },
  { key: 'status', enabled: false },
  { key: 'oversight', enabled: false },
  { key: 'attendance', enabled: false },
]

export function loadTagSettings(): TagItem[] {
  try {
    const s = localStorage.getItem('people-tag-settings')
    if (s) {
      const saved = JSON.parse(s) as TagItem[]
      const savedKeys = new Set(saved.map((t) => t.key))
      return [...saved, ...DEFAULT_TAGS.filter((t) => !savedKeys.has(t.key))]
    }
  } catch {}
  return DEFAULT_TAGS
}

export function saveTagSettings(settings: TagItem[]) {
  localStorage.setItem('people-tag-settings', JSON.stringify(settings))
}

export type DotEntry = { color: 'green' | 'red' | 'yellow'; date: string }
export type AttDots = Record<string, DotEntry[]>

export function usePeoplePage() {
  const navigate = useNavigate()
  const canCreate = usePermission('people.create')
  const canViewPeople = usePermission('people.view')
  const canViewAdminProfiles = usePermission('admins.viewProfiles')

  const [people, setPeople] = useState<GroupMember[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdmins, setShowAdmins] = useState(true)
  const [myOversight, setMyOversight] = useState(false)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set())
  const [tagSettings, setTagSettings] = useState<TagItem[]>(loadTagSettings)
  const [attDots, setAttDots] = useState<AttDots>({})

  useEffect(() => {
    groupsApi.getAll().then((gs) => {
      setGroups(gs)
      setSelectedGroupIds(new Set(gs.map((g) => g.id)))
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    peopleApi
      .getAll(search || undefined, undefined, showAdmins && !myOversight, myOversight || undefined)
      .then(setPeople)
      .finally(() => setLoading(false))
  }, [search, showAdmins, myOversight])

  useEffect(() => {
    const attEnabled = tagSettings.some((t) => t.key === 'attendance' && t.enabled)
    if (!attEnabled || people.length === 0) return
    const groupIds = [
      ...new Set(people.map((p) => p.primaryGroupId).filter((id): id is number => id != null)),
    ]
    Promise.all(
      groupIds.map((gid) =>
        attendanceApi.getDots(gid).then((r: AttendanceDotsResponse) => ({ gid, r }))
      )
    ).then((results) => {
      const map: AttDots = {}
      for (const { gid, r } of results) {
        const cancelledSet = new Set(r.cancelledDates)
        const recordMap = new Map<string, boolean>()
        for (const rec of r.records) {
          const k =
            rec.personId != null
              ? `p_${rec.personId}_${rec.date}`
              : `u_${rec.userId}_${rec.date}`
          recordMap.set(k, rec.wasPresent)
        }
        const sortedDates = [...r.dates].reverse()
        for (const person of people.filter((p) => p.primaryGroupId === gid)) {
          const key = person.isAdmin ? `u_${person.userId}` : `p_${person.id}`
          const dots: DotEntry[] = sortedDates.map((date: string) => {
            if (cancelledSet.has(date)) return { color: 'yellow', date }
            const recKey = person.isAdmin
              ? `u_${person.userId}_${date}`
              : `p_${person.id}_${date}`
            const wasPresent = recordMap.get(recKey)
            return { color: wasPresent === true ? 'green' : 'red', date }
          })
          map[key] = dots.slice(0, 5)
        }
      }
      setAttDots(map)
    })
  }, [people, tagSettings])

  const handleItemClick = (m: GroupMember) => {
    if (m.isAdmin) {
      if (canViewAdminProfiles) navigate(`/admins/${m.userId}`)
    } else {
      if (canViewPeople) navigate(`/people/${m.id}`)
    }
  }

  const allSelected = selectedGroupIds.size === groups.length
  const showGroupFilter = groups.length > 1

  const filtered = allSelected
    ? people
    : people.filter((m) => m.primaryGroupId != null && selectedGroupIds.has(m.primaryGroupId))

  const toggleGroupId = (id: number) =>
    setSelectedGroupIds((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const toggleAllGroups = () =>
    setSelectedGroupIds(allSelected ? new Set() : new Set(groups.map((g) => g.id)))

  const updateTagSettings = (settings: TagItem[]) => {
    saveTagSettings(settings)
    setTagSettings(settings)
  }

  return {
    people: filtered,
    groups,
    loading,
    search,
    setSearch,
    showAdmins,
    setShowAdmins,
    myOversight,
    setMyOversight,
    selectedGroupIds,
    toggleGroupId,
    toggleAllGroups,
    allSelected,
    showGroupFilter,
    tagSettings,
    updateTagSettings,
    attDots,
    handleItemClick,
    canCreate,
    canViewPeople,
    canViewAdminProfiles,
    navigate,
  }
}
