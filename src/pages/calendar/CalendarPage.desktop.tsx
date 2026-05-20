import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Modal, Form, Input, Select, Checkbox, Tooltip, Tag, Spin,
  Typography, Space, Segmented,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, LeftOutlined, RightOutlined,
} from '@ant-design/icons'
import { calendarApi, roomsApi, type CalendarEventPayload } from '@/api/calendar'
import { groupsApi } from '@/api/groups'
import { useAuth } from '@/store/auth'
import type { CalendarOccurrence, CalendarEvent, Room, Group } from '@/types'
import {
  HOUR_HEIGHT, PX_PER_MIN, TIME_AXIS_WIDTH, HOURS,
  DAY_ABBR, UKR_MONTHS_SHORT, UKR_DAYS_FULL,
  TYPE_COLORS, TYPE_LABELS,
  addDays, mondayOf, getDefaultSelectedDate, formatDate, isSameDay, timeToMin, eventColor,
  layoutEvents, type Laid,
} from './calendarUtils'

const { Text } = Typography

// ── EventBlock ────────────────────────────────────────────────────────────────

function EventBlock({ ev, onClick }: { ev: Laid; onClick: () => void }) {
  const startMin = timeToMin(ev.startTime ?? '08:00')
  const endMin = ev.endTime ? timeToMin(ev.endTime) : startMin + 60
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 22)
  const top = startMin * PX_PER_MIN
  const color = eventColor(ev)
  const widthPct = 100 / ev.totalLanes
  const leftPct = (ev.lane / ev.totalLanes) * 100

  const content = (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', top, height,
        left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 2px)`,
        background: ev.isGhost ? `${color}08` : `${color}18`,
        border: 'none',
        borderLeft: ev.isGhost ? 'none' : `3px solid ${color}`,
        borderRadius: '0 4px 4px 0',
        padding: '2px 6px', overflow: 'hidden',
        textAlign: 'left', cursor: 'pointer',
        zIndex: 2, outline: 'none',
        opacity: ev.isGhost ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ev.title}
      </div>
      {height > 30 && ev.startTime && (
        <div style={{ fontSize: 10, color: `${color}BB`, lineHeight: 1.2 }}>
          {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}
        </div>
      )}
      {height > 44 && ev.room?.name && (
        <div style={{ fontSize: 10, color: `${color}99`, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.room.name}
        </div>
      )}
    </button>
  )

  return (
    <Tooltip
      title={
        <div>
          <div style={{ fontWeight: 700 }}>{ev.title}</div>
          {ev.startTime && <div>{ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}</div>}
          {ev.room?.name && <div>{ev.room.name}</div>}
          {ev.homeGroupName && <div>{ev.homeGroupName}</div>}
        </div>
      }
      placement="right"
    >
      {content}
    </Tooltip>
  )
}

// ── EventForm Modal ───────────────────────────────────────────────────────────

type FormState = {
  title: string; description: string; location: string; roomId: string
  type: string; homeGroupId: string
  recurringDayOfWeek: string; startTime: string; endTime: string; date: string
  isHomeGroupMeeting: boolean
}

function EventFormModal({
  open, event, groups, rooms, defaultDate, onDone, onCancel,
}: {
  open: boolean
  event: CalendarEvent | null
  groups: Group[]
  rooms: Room[]
  defaultDate: string
  onDone: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>({
    title: '', description: '', location: '', roomId: '',
    type: 'Global', homeGroupId: '', recurringDayOfWeek: '1',
    startTime: '19:00', endTime: '21:00', date: defaultDate,
    isHomeGroupMeeting: true,
  })
  const [saving, setSaving] = useState(false)
  const [dayOccurrences, setDayOccurrences] = useState<CalendarOccurrence[]>([])

  useEffect(() => {
    if (!open) return
    setForm({
      title: event?.title ?? '',
      description: event?.description ?? '',
      location: event?.location ?? '',
      roomId: event?.roomId?.toString() ?? '',
      type: event?.type ?? 'Global',
      homeGroupId: event?.homeGroupId?.toString() ?? '',
      recurringDayOfWeek: event?.recurringDayOfWeek?.toString() ?? '1',
      startTime: event?.startTime ?? '19:00',
      endTime: event?.endTime ?? '21:00',
      date: event?.date ?? defaultDate,
      isHomeGroupMeeting: event?.isHomeGroupMeeting ?? true,
    })
  }, [open, event, defaultDate])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const isRecurring = event ? event.isRecurring : form.type === 'Recurring'
  const isAutoHomeGroup = event?.type === 'HomeGroup' && event?.isRecurring
  const isGoogleEvent = event?.type === 'Google'

  useEffect(() => {
    if (isRecurring || !form.date) { setDayOccurrences([]); return }
    calendarApi.getOccurrences({ from: form.date, to: form.date }).then(setDayOccurrences).catch(() => {})
  }, [form.date, isRecurring])

  const bookedRoomIds = useMemo(() => {
    const s = new Set<number>()
    if (!form.startTime) return s
    const fStart = timeToMin(form.startTime)
    const fEnd = form.endTime ? timeToMin(form.endTime) : fStart + 60
    for (const occ of dayOccurrences) {
      if (!occ.roomId) continue
      if (event?.id === occ.eventId) continue
      const oStart = timeToMin(occ.startTime ?? '00:00')
      const oEnd = occ.endTime ? timeToMin(occ.endTime) : oStart + 60
      if (fStart < oEnd && oStart < fEnd) s.add(Number(occ.roomId))
    }
    return s
  }, [dayOccurrences, form.startTime, form.endTime, event?.id])

  const groupedRooms = useMemo(() => {
    const acc: Record<string, Record<number, Room[]>> = {}
    for (const r of rooms) {
      if (!acc[r.building]) acc[r.building] = {}
      if (!acc[r.building][r.floor]) acc[r.building][r.floor] = []
      acc[r.building][r.floor].push(r)
    }
    return acc
  }, [rooms])

  const buildPayload = (): CalendarEventPayload => {
    if (isGoogleEvent && event) {
      return {
        title: event.title, description: event.description, location: event.location,
        roomId: form.roomId ? Number(form.roomId) : null,
        type: 'Google', homeGroupId: null, isRecurring: false, recurringDayOfWeek: null,
        startTime: event.startTime, endTime: event.endTime, date: event.date,
      }
    }
    return {
      title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null,
      roomId: form.roomId ? Number(form.roomId) : null, type: form.type,
      homeGroupId: form.type === 'HomeGroup' && form.homeGroupId ? Number(form.homeGroupId) : null,
      isRecurring, recurringDayOfWeek: isRecurring ? Number(form.recurringDayOfWeek) : null,
      startTime: form.startTime || null, endTime: form.endTime || null,
      date: !isRecurring ? form.date : null,
      isHomeGroupMeeting: form.type === 'HomeGroup' && !isRecurring ? form.isHomeGroupMeeting : null,
    }
  }

  const handleSave = async () => {
    if (!isGoogleEvent && !form.title.trim()) {
      Modal.error({ title: 'Введіть назву' }); return
    }
    setSaving(true)
    try {
      if (event) await calendarApi.update(event.id, buildPayload())
      else await calendarApi.create(buildPayload())
      onDone()
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally { setSaving(false) }
  }

  const handleDelete = () => {
    if (!event) return
    Modal.confirm({
      title: 'Видалити подію?',
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await calendarApi.delete(event.id)
        onDone()
      },
    })
  }

  const roomOptions = [
    { label: '— Без бронювання —', value: '' },
    ...(['Church', 'SocialCenter'] as const)
      .filter((b) => groupedRooms[b])
      .flatMap((building) =>
        Object.entries(groupedRooms[building])
          .sort(([a], [b]) => Number(a) - Number(b))
          .flatMap(([floorStr, floorRooms]) =>
            floorRooms.map((room) => ({
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: room.color, flexShrink: 0, display: 'inline-block' }} />
                  <span>{room.name}</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>{building === 'Church' ? 'Церква' : 'Соц. центр'} · {floorStr} пов.</Text>
                  {bookedRoomIds.has(room.id) && <Tag color="default" style={{ fontSize: 10, padding: '0 4px', marginLeft: 'auto' }}>заброньовано</Tag>}
                </span>
              ),
              value: String(room.id),
              disabled: bookedRoomIds.has(room.id),
            }))
          )
      ),
  ]

  return (
    <Modal
      open={open}
      title={event ? 'Редагувати подію' : 'Нова подія'}
      onCancel={onCancel}
      width={500}
      footer={
        <Space style={{ width: '100%', justifyContent: event ? 'space-between' : 'flex-end' }}>
          {event && (
            <Button danger onClick={handleDelete}>Видалити</Button>
          )}
          <Space>
            <Button onClick={onCancel}>Скасувати</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              {isGoogleEvent ? 'Зберегти кімнату' : event ? 'Зберегти' : 'Створити'}
            </Button>
          </Space>
        </Space>
      }
      destroyOnClose
    >
      {isGoogleEvent && (
        <div style={{ padding: '8px 12px', background: `${TYPE_COLORS.Google}18`, borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#047857' }}>
          Подія з Google Calendar. Редагувати можна лише бронювання кімнати.
        </div>
      )}
      {isAutoHomeGroup && (
        <div style={{ padding: '8px 12px', background: '#F59E0B18', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#B45309' }}>
          Авто-подія домашньої групи. Час зустрічі змінюється в налаштуваннях групи.
        </div>
      )}

      {isGoogleEvent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><Text type="secondary">Назва</Text><div>{event!.title}</div></div>
          {event?.description && <div><Text type="secondary">Опис</Text><div style={{ whiteSpace: 'pre-wrap' }}>{event.description}</div></div>}
          {event?.location && <div><Text type="secondary">Локація</Text><div>{event.location}</div></div>}
          {event?.date && <div><Text type="secondary">Дата та час</Text><div>{event.date}{event.startTime ? ` · ${event.startTime}${event.endTime ? `–${event.endTime}` : ''}` : ''}</div></div>}
          <Form.Item label="Кімната" style={{ marginBottom: 0 }}>
            <Select value={form.roomId} onChange={(v) => set('roomId', v)} options={roomOptions} style={{ width: '100%' }} />
          </Form.Item>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!event && (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Тип</div>
              <Segmented
                block
                value={form.type}
                onChange={(v) => set('type', v as string)}
                options={(['Recurring', 'Global', 'HomeGroup'] as const).map((t) => ({
                  label: <span style={{ color: form.type === t ? TYPE_COLORS[t] : undefined, fontWeight: form.type === t ? 700 : 400 }}>{TYPE_LABELS[t]}</span>,
                  value: t,
                }))}
              />
            </div>
          )}

          {form.type === 'HomeGroup' && (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Домашня група</div>
              <Select value={form.homeGroupId} onChange={(v) => set('homeGroupId', v)} style={{ width: '100%' }} placeholder="— Вибрати групу —">
                {groups.map((g) => (
                  <Select.Option key={g.id} value={String(g.id)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, display: 'inline-block' }} />
                      {g.name}
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}

          {form.type === 'HomeGroup' && !isRecurring && (
            <Checkbox checked={form.isHomeGroupMeeting} onChange={(e) => set('isHomeGroupMeeting', e.target.checked)}>
              Це зустріч домашньої групи
            </Checkbox>
          )}

          {!isAutoHomeGroup && (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Назва</div>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Назва події" />
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Опис</div>
            <Input.TextArea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Необов'язково" rows={2} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Локація</div>
            <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Де відбудеться?" />
          </div>

          {isRecurring ? (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>День тижня</div>
              <Select value={form.recurringDayOfWeek} onChange={(v) => set('recurringDayOfWeek', v)} style={{ width: '100%' }}>
                {UKR_DAYS_FULL.map((name, i) => <Select.Option key={i} value={String(i)}>{name}</Select.Option>)}
              </Select>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Дата</div>
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Початок</div>
              <Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Кінець</div>
              <Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
            </div>
          </div>

          {rooms.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Бронювання кімнати</div>
              {isRecurring && (
                <div style={{ fontSize: 11, color: '#B45309', marginBottom: 4 }}>Для повторюваних подій конфлікти не перевіряються</div>
              )}
              <Select value={form.roomId} onChange={(v) => set('roomId', v)} options={roomOptions} style={{ width: '100%' }} />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CalendarPageDesktop() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { hasPermission } = useAuth()

  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(getDefaultSelectedDate()))
  const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([])
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('cal_types')
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set(['Recurring', 'Global', 'HomeGroup', 'Google'])
    } catch { return new Set(['Recurring', 'Global', 'HomeGroup', 'Google']) }
  })
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set())
  const [groups, setGroups] = useState<Group[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // Mon–Sun of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Header label: "21–27 Тра 2025" or "28 Тра – 3 Чер 2025" (cross-month)
  const weekLabel = (() => {
    const sun = weekDays[6]
    const monMonth = weekStart.getMonth()
    const sunMonth = sun.getMonth()
    const year = weekStart.getFullYear()
    if (monMonth === sunMonth) {
      return `${weekStart.getDate()}–${sun.getDate()} ${UKR_MONTHS_SHORT[monMonth]} ${year}`
    }
    return `${weekStart.getDate()} ${UKR_MONTHS_SHORT[monMonth]} – ${sun.getDate()} ${UKR_MONTHS_SHORT[sunMonth]} ${year}`
  })()

  const defaultFormDate = formatDate(weekDays.find((d) => isSameDay(d, today)) ?? weekDays[0])

  useEffect(() => {
    Promise.all([groupsApi.getAll(), roomsApi.getAll()]).then(([gs, rms]) => {
      setGroups(gs)
      setRooms(rms)
      const savedIds = localStorage.getItem('cal_groupIds')
      let restored: Set<number> | null = null
      if (savedIds) {
        try {
          const parsed = JSON.parse(savedIds) as number[]
          if (parsed.length > 0) restored = new Set(parsed)
        } catch { /* ignore */ }
      }
      setSelectedGroupIds(restored ?? new Set(gs.map((g) => g.id)))
      setGroupsLoaded(true)
    })
  }, [])

  useEffect(() => { localStorage.setItem('cal_types', JSON.stringify([...activeTypes])) }, [activeTypes])
  useEffect(() => { localStorage.setItem('cal_groupIds', JSON.stringify([...selectedGroupIds])) }, [selectedGroupIds])

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  const loadOccurrences = (start: Date, types: Set<string>, groupIds: Set<number>) => {
    const effectiveTypes = new Set(types)
    if (groupIds.size === 0) effectiveTypes.delete('HomeGroup')
    if (effectiveTypes.size === 0) { setOccurrences([]); return }
    const fri = addDays(start, 4)
    calendarApi.getOccurrences({
      from: formatDate(start),
      to: formatDate(fri),
      types: [...effectiveTypes].join(','),
      groupIds: groupIds.size > 0 ? [...groupIds].join(',') : undefined,
    }).then(setOccurrences).catch(() => {})
  }

  useEffect(() => {
    if (!groupsLoaded) return
    loadOccurrences(weekStart, activeTypes, selectedGroupIds)
  }, [weekStart, activeTypes, selectedGroupIds, groupsLoaded])

  const eventsFor = (d: Date) => occurrences.filter((o) => o.date === formatDate(d))

  const handleEventClick = async (o: CalendarOccurrence) => {
    if (!hasPermission('calendar.events.manage')) return
    try {
      const ev = await calendarApi.getEvent(o.eventId)
      setEditingEvent(ev)
      setFormKey((k) => k + 1)
      setFormOpen(true)
    } catch {
      Modal.error({ title: 'Помилка завантаження' })
    }
  }

  const handleFormDone = () => {
    setFormOpen(false)
    setEditingEvent(null)
    loadOccurrences(weekStart, activeTypes, selectedGroupIds)
  }

  const handleGoogleSync = async () => {
    setSyncing(true)
    try {
      const result = await calendarApi.googleSync()
      Modal.success({ title: `Синхронізовано: ${result.synced} подій` })
      loadOccurrences(weekStart, activeTypes, selectedGroupIds)
    } catch {
      Modal.error({ title: 'Помилка синхронізації' })
    } finally { setSyncing(false) }
  }

  const toggleType = (t: string) => setActiveTypes((prev) => {
    const next = new Set(prev)
    next.has(t) ? next.delete(t) : next.add(t)
    return next
  })

  const toggleGroup = (id: number) => setSelectedGroupIds((prev) => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const allGroupsSelected = groups.length > 0 && selectedGroupIds.size === groups.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fff' }}>
      {/* Top toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, marginRight: 8 }}>Календар</span>

        {/* Week navigation */}
        <Button icon={<LeftOutlined />} size="small" onClick={() => setWeekStart((p) => addDays(p, -7))} />
        <Button icon={<RightOutlined />} size="small" onClick={() => setWeekStart((p) => addDays(p, 7))} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.65)', minWidth: 160 }}>{weekLabel}</span>
        <Button
          size="small"
          onClick={() => setWeekStart(mondayOf(today))}
          style={{ marginRight: 4 }}
        >
          Сьогодні
        </Button>

        <div style={{ flex: 1 }} />

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['Google', 'Recurring', 'Global'] as const).map((t) => {
            const active = activeTypes.has(t)
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  padding: '3px 10px', borderRadius: 9999, border: `1.5px solid ${active ? TYPE_COLORS[t] : 'rgba(0,0,0,0.15)'}`,
                  background: active ? `${TYPE_COLORS[t]}18` : 'transparent',
                  color: active ? TYPE_COLORS[t] : 'rgba(0,0,0,0.45)',
                  fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            )
          })}
        </div>

        {hasPermission('calendar.google.sync') && (
          <Button
            icon={<ReloadOutlined spin={syncing} />}
            onClick={handleGoogleSync}
            disabled={syncing}
            style={{ color: TYPE_COLORS.Google, borderColor: TYPE_COLORS.Google }}
          >
            Google Sync
          </Button>
        )}

        {hasPermission('calendar.events.manage') && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingEvent(null); setFormKey((k) => k + 1); setFormOpen(true) }}
          >
            Нова подія
          </Button>
        )}
      </div>

      {/* Groups filter bar */}
      {groups.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          overflowX: 'auto', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>Домашки:</span>
          <button
            onClick={() => setSelectedGroupIds(allGroupsSelected ? new Set() : new Set(groups.map((g) => g.id)))}
            style={{
              padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)',
              background: 'transparent', cursor: 'pointer', fontSize: 12, flexShrink: 0,
              color: 'rgba(0,0,0,0.65)',
            }}
          >
            {allGroupsSelected ? 'Зняти всі' : 'Всі'}
          </button>
          {groups.map((g) => {
            const active = selectedGroupIds.has(g.id)
            return (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                style={{
                  padding: '2px 8px', borderRadius: 9999, border: `1.5px solid ${active ? g.color : 'rgba(0,0,0,0.15)'}`,
                  background: active ? `${g.color}18` : 'transparent',
                  color: active ? g.color : 'rgba(0,0,0,0.45)',
                  fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, opacity: active ? 1 : 0.4 }} />
                {g.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Calendar grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {/* Sticky header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${TIME_AXIS_WIDTH}px repeat(7, 1fr)`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 10,
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}>
          <div />
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={i}
                style={{
                  textAlign: 'center', padding: '8px 4px',
                  borderLeft: '1px solid rgba(0,0,0,0.06)',
                  background: isToday ? 'rgba(42,175,202,0.04)' : undefined,
                }}
              >
                <div style={{ fontSize: 11, color: isToday ? 'var(--color-primary)' : 'rgba(0,0,0,0.45)', fontWeight: 500 }}>
                  {DAY_ABBR[day.getDay()]}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, lineHeight: 1.2,
                  color: isToday ? 'var(--color-primary)' : 'rgba(0,0,0,0.85)',
                }}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Grid body */}
        <div style={{ position: 'relative', height: HOUR_HEIGHT * 24, display: 'flex' }}>
          {/* Time axis */}
          <div style={{ width: TIME_AXIS_WIDTH, flexShrink: 0, position: 'relative' }}>
            {HOURS.map((h) => h > 0 && (
              <div key={h} style={{
                position: 'absolute', top: h * HOUR_HEIGHT - 7, right: 6,
                fontSize: 10, color: 'rgba(0,0,0,0.3)', lineHeight: 1,
              }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, colIdx) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={colIdx}
                style={{
                  flex: 1, position: 'relative',
                  borderLeft: '1px solid rgba(0,0,0,0.06)',
                  background: isToday ? 'rgba(42,175,202,0.02)' : undefined,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${HOUR_HEIGHT - 1}px, rgba(0,0,0,0.03) ${HOUR_HEIGHT - 1}px, rgba(0,0,0,0.03) ${HOUR_HEIGHT}px)`,
                }}
              >
                {isToday && (
                  <div style={{ position: 'absolute', top: nowMin * PX_PER_MIN, left: 0, right: 0, zIndex: 4, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: -5, top: -4, width: 9, height: 9, borderRadius: 9999, background: '#ff4d4f' }} />
                    <div style={{ height: 2, background: '#ff4d4f' }} />
                  </div>
                )}
                {layoutEvents(eventsFor(day)).map((ev, j) => (
                  <EventBlock key={j} ev={ev} onClick={() => handleEventClick(ev)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <Spin spinning={!groupsLoaded} style={{ position: 'absolute', top: '50%', left: '50%' }} />

      <EventFormModal
        key={formKey}
        open={formOpen}
        event={editingEvent}
        groups={groups}
        rooms={rooms}
        defaultDate={defaultFormDate}
        onDone={handleFormDone}
        onCancel={() => { setFormOpen(false); setEditingEvent(null) }}
      />
    </div>
  )
}
