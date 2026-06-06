import { useEffect, useMemo, useRef, useState } from 'react'
import { NavBar, Popup, Toast, Dialog, Button, Checkbox } from 'antd-mobile'
import { AddOutline, LeftOutline, RightOutline, RedoOutline } from 'antd-mobile-icons'
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

// ── Mobile-only constants ─────────────────────────────────────────────────────

const STRIP_CELL_W = 40
const STRIP_CIRCLE = 32
const STRIP_CELL_PAD = (STRIP_CELL_W - STRIP_CIRCLE) / 2

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterPill({
  label, active, onToggle, disabled = false, arrow = false, color,
}: {
  label: string; active: boolean; onToggle: () => void
  disabled?: boolean; arrow?: boolean; color?: string
}) {
  const c = color ?? 'var(--color-primary)'
  const activeBg = color ? `${color}18` : 'var(--color-primary-bg)'
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        padding: '5px 11px', borderRadius: 9999, border: '1.5px solid', flexShrink: 0,
        borderColor: disabled ? 'var(--color-border)' : active ? c : 'var(--color-border)',
        background: disabled ? 'var(--color-border-light)' : active ? activeBg : 'transparent',
        color: disabled ? 'var(--color-text-tertiary)' : active ? c : 'var(--color-text-secondary)',
        fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 3,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {label}{arrow && <span style={{ fontSize: 10 }}>▾</span>}
    </button>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
  borderRadius: 8, fontSize: 15, outline: 'none', background: 'var(--color-surface)',
  color: 'var(--color-text)', boxSizing: 'border-box', fontFamily: 'inherit',
}

function EventBlock({ ev, onClick }: { ev: Laid; onClick: () => void }) {
  const startMin = timeToMin(ev.startTime ?? '08:00')
  const endMin = ev.endTime ? timeToMin(ev.endTime) : startMin + 60
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 24)
  const top = startMin * PX_PER_MIN
  const color = eventColor(ev)
  const widthPct = 100 / ev.totalLanes
  const leftPct = (ev.lane / ev.totalLanes) * 100

  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', top, height,
        left: `${leftPct}%`, width: `${widthPct}%`,
        background: ev.isGhost ? `${color}08` : `${color}18`,
        border: 'none',
        borderLeft: ev.isGhost ? 'none' : `3px solid ${color}`,
        borderRadius: '0 4px 4px 0',
        padding: '2px 5px', overflow: 'hidden',
        textAlign: 'left', cursor: 'pointer',
        zIndex: 2, WebkitTapHighlightColor: 'transparent',
        outline: 'none',
        opacity: ev.isGhost ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ev.title}
      </div>
      {height > 32 && ev.startTime && (
        <div style={{ fontSize: 10, color: `${color}BB`, lineHeight: 1.2 }}>
          {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}
        </div>
      )}
    </button>
  )
}

// ── Event form ────────────────────────────────────────────────────────────────

type FormState = {
  title: string; description: string; location: string; roomId: string
  type: string; homeGroupId: string
  recurringDayOfWeek: string; startTime: string; endTime: string; date: string
  isHomeGroupMeeting: boolean
}

function EventForm({
  event, groups, rooms, defaultDate, onDone, onCancel,
}: {
  event: CalendarEvent | null
  groups: Group[]
  rooms: Room[]
  defaultDate: string
  onDone: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>({
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
  const [saving, setSaving] = useState(false)
  const [roomPickerVisible, setRoomPickerVisible] = useState(false)
  const [dayOccurrences, setDayOccurrences] = useState<CalendarOccurrence[]>([])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const isRecurring = event ? event.isRecurring : form.type === 'Recurring'

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

  const selectedRoom = rooms.find((r) => r.id === Number(form.roomId))

  const groupedRooms = useMemo(() => {
    const acc: Record<string, Record<number, Room[]>> = {}
    for (const r of rooms) {
      if (!acc[r.building]) acc[r.building] = {}
      if (!acc[r.building][r.floor]) acc[r.building][r.floor] = []
      acc[r.building][r.floor].push(r)
    }
    return acc
  }, [rooms])

  const isAutoHomeGroup = event?.type === 'HomeGroup' && event?.isRecurring
  const isGoogleEvent = event?.type === 'Google'

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
    if (!isGoogleEvent && !form.title.trim()) { Toast.show({ content: 'Введіть назву', icon: 'fail' }); return }
    setSaving(true)
    try {
      if (event) await calendarApi.update(event.id, buildPayload())
      else await calendarApi.create(buildPayload())
      Toast.show({ content: event ? 'Збережено' : 'Створено', icon: 'success' })
      onDone()
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally { setSaving(false) }
  }

  const handleDelete = () => {
    if (!event) return
    Dialog.confirm({
      content: 'Видалити подію?', confirmText: 'Видалити', cancelText: 'Скасувати',
      onConfirm: async () => {
        try { await calendarApi.delete(event.id); Toast.show({ content: 'Видалено', icon: 'success' }); onDone() }
        catch { Toast.show({ content: 'Помилка видалення', icon: 'fail' }) }
      },
    })
  }

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{event ? 'Редагувати подію' : 'Нова подія'}</span>
        {event && <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}>Видалити</button>}
      </div>

      {isGoogleEvent && <div style={{ padding: '8px 12px', background: `${TYPE_COLORS.Google}18`, borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#047857' }}>Подія з Google Calendar. Редагувати можна лише бронювання кімнати.</div>}
      {isAutoHomeGroup && <div style={{ padding: '8px 12px', background: '#F59E0B18', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#B45309' }}>Авто-подія домашньої групи. Час зустрічі змінюється в налаштуваннях групи.</div>}

      {isGoogleEvent ? (
        <>
          <FormField label="Назва"><div style={{ ...inputStyle, background: 'var(--color-border-light)' }}>{event!.title}</div></FormField>
          {event?.description && <FormField label="Опис"><div style={{ ...inputStyle, background: 'var(--color-border-light)', whiteSpace: 'pre-wrap' }}>{event.description}</div></FormField>}
          {event?.location && <FormField label="Локація"><div style={{ ...inputStyle, background: 'var(--color-border-light)' }}>{event.location}</div></FormField>}
          {event?.date && <FormField label="Дата та час"><div style={{ ...inputStyle, background: 'var(--color-border-light)' }}>{event.date}{event.startTime ? ` · ${event.startTime}${event.endTime ? `–${event.endTime}` : ''}` : ''}</div></FormField>}
        </>
      ) : (
        <>
          <FormField label="Тип">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Recurring', 'Global', 'HomeGroup'] as const).map((t) => (
                <button key={t} onClick={() => set('type', t)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1.5px solid ${form.type === t ? TYPE_COLORS[t] : 'var(--color-border)'}`, background: form.type === t ? `${TYPE_COLORS[t]}18` : 'transparent', color: form.type === t ? TYPE_COLORS[t] : 'var(--color-text-secondary)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{TYPE_LABELS[t]}</button>
              ))}
            </div>
          </FormField>
          {form.type === 'HomeGroup' && <FormField label="Домашня група"><select value={form.homeGroupId} onChange={(e) => set('homeGroupId', e.target.value)} style={inputStyle}><option value="">— Вибрати групу —</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></FormField>}
          {form.type === 'HomeGroup' && !isRecurring && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 0' }}>
              <input type="checkbox" id="isHomeGroupMeeting" checked={form.isHomeGroupMeeting} onChange={(e) => set('isHomeGroupMeeting', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <label htmlFor="isHomeGroupMeeting" style={{ fontSize: 14, cursor: 'pointer' }}>Це зустріч домашньої групи</label>
            </div>
          )}
          <FormField label="Назва" required><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Назва події" style={inputStyle} /></FormField>
          <FormField label="Опис"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Необов'язково" rows={2} style={{ ...inputStyle, resize: 'none' }} /></FormField>
          <FormField label="Локація"><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Де відбудеться?" style={inputStyle} /></FormField>
        </>
      )}

      {rooms.length > 0 && (
        <FormField label="Бронювання">
          <button onClick={() => setRoomPickerVisible(true)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {selectedRoom ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedRoom.color, flexShrink: 0 }} />{selectedRoom.name}</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>— Без бронювання —</span>}
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>▾</span>
          </button>
        </FormField>
      )}

      {!isGoogleEvent && (
        <>
          {isRecurring ? (
            <FormField label="День тижня"><select value={form.recurringDayOfWeek} onChange={(e) => set('recurringDayOfWeek', e.target.value)} style={inputStyle}>{UKR_DAYS_FULL.map((name, i) => <option key={i} value={i}>{name}</option>)}</select></FormField>
          ) : (
            <FormField label="Дата"><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={inputStyle} /></FormField>
          )}
          <div style={{ display: 'flex', gap: 20 }}>
            <FormField label="Початок"><input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} style={inputStyle} /></FormField>
            <FormField label="Кінець"><input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} style={inputStyle} /></FormField>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button block fill="outline" onClick={onCancel}>Скасувати</Button>
        <Button block color="primary" loading={saving} onClick={handleSave}>{isGoogleEvent ? 'Зберегти кімнату' : event ? 'Зберегти' : 'Створити'}</Button>
      </div>

      <Popup visible={roomPickerVisible} onMaskClick={() => setRoomPickerVisible(false)} position="bottom" bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '72vh', overflowY: 'auto', padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Бронювання кімнати</div>
        {isRecurring && <div style={{ padding: '8px 12px', background: '#F59E0B18', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#B45309' }}>Для повторюваних подій конфлікти не перевіряються</div>}
        <button onClick={() => { set('roomId', ''); setRoomPickerVisible(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px', borderRadius: 8, border: 'none', marginBottom: 8, background: !form.roomId ? 'var(--color-primary-bg)' : 'transparent', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>— Без бронювання —</span>
          {!form.roomId && <span style={{ color: 'var(--color-primary)', fontSize: 16 }}>✓</span>}
        </button>
        {(['Church', 'SocialCenter'] as const).filter((b) => groupedRooms[b]).map((building) => (
          <div key={building}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 12, marginBottom: 6 }}>{building === 'Church' ? 'Церква' : 'Соц. центр'}</div>
            {Object.entries(groupedRooms[building]).sort(([a], [b]) => Number(a) - Number(b)).map(([floorStr, floorRooms]) => (
              <div key={floorStr}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4, marginLeft: 4 }}>Поверх {floorStr}</div>
                {floorRooms.map((room) => {
                  const isBooked = bookedRoomIds.has(room.id)
                  const isSelected = form.roomId === String(room.id)
                  return (
                    <button key={room.id} disabled={isBooked} onClick={() => { if (!isBooked) { set('roomId', String(room.id)); setRoomPickerVisible(false) } }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, border: 'none', marginBottom: 2, background: isSelected ? 'var(--color-primary-bg)' : 'transparent', cursor: isBooked ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: room.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: 'left', fontSize: 15, color: isBooked ? 'var(--color-text-secondary)' : 'var(--color-text)' }}>{room.name}</span>
                      {isBooked && <span style={{ background: '#1F2937', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>заброньовано</span>}
                      {isSelected && !isBooked && <span style={{ color: 'var(--color-primary)', fontSize: 16, flexShrink: 0 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
        <Button block fill="outline" style={{ marginTop: 16 }} onClick={() => setRoomPickerVisible(false)}>Закрити</Button>
      </Popup>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CalendarPageMobile() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { hasPermission } = useAuth()

  const [selectedDate, setSelectedDate] = useState<Date>(getDefaultSelectedDate)
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
  const [groupsDrawerVisible, setGroupsDrawerVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const col0 = selectedDate
  const col1 = addDays(selectedDate, 1)
  const col2 = addDays(selectedDate, 2)

  const weekStart = mondayOf(selectedDate)
  const stripDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dow = selectedDate.getDay()
  const selOffset = dow === 0 ? 6 : dow - 1

  useEffect(() => {
    Promise.all([groupsApi.getAll(), roomsApi.getAll()]).then(([gs, rms]) => {
      setGroups(gs)
      setRooms(rms)
      const savedIds = localStorage.getItem('cal_groupIds')
      let restored: Set<number> | null = null
      if (savedIds) {
        try { const parsed = JSON.parse(savedIds) as number[]; if (parsed.length > 0) restored = new Set(parsed) } catch { /* ignore */ }
      }
      setSelectedGroupIds(restored ?? new Set(gs.map((g) => g.id)))
      setGroupsLoaded(true)
    })
  }, [])

  useEffect(() => { localStorage.setItem('cal_types', JSON.stringify([...activeTypes])) }, [activeTypes])
  useEffect(() => { localStorage.setItem('cal_groupIds', JSON.stringify([...selectedGroupIds])) }, [selectedGroupIds])
  useEffect(() => { if (gridRef.current) gridRef.current.scrollTop = 7 * HOUR_HEIGHT }, [])

  const loadOccurrences = (date: Date, types: Set<string>, groupIds: Set<number>) => {
    const effectiveTypes = new Set(types)
    if (groupIds.size === 0) effectiveTypes.delete('HomeGroup')
    if (effectiveTypes.size === 0) { setOccurrences([]); return }
    calendarApi.getOccurrences({ from: formatDate(date), to: formatDate(addDays(date, 2)), types: [...effectiveTypes].join(','), groupIds: groupIds.size > 0 ? [...groupIds].join(',') : undefined }).then(setOccurrences).catch(() => {})
  }

  useEffect(() => { if (!groupsLoaded) return; loadOccurrences(selectedDate, activeTypes, selectedGroupIds) }, [selectedDate, activeTypes, selectedGroupIds, groupsLoaded])

  const eventsFor = (d: Date) => occurrences.filter((o) => o.date === formatDate(d))

  const handleEventClick = async (o: CalendarOccurrence) => {
    if (!hasPermission('calendar.events.manage')) return
    try { const ev = await calendarApi.getEvent(o.eventId); setEditingEvent(ev); setFormKey((k) => k + 1); setFormVisible(true) }
    catch { Toast.show({ content: 'Помилка завантаження', icon: 'fail' }) }
  }

  const handleFormDone = () => { setFormVisible(false); setEditingEvent(null); loadOccurrences(selectedDate, activeTypes, selectedGroupIds) }

  const handleGoogleSync = async () => {
    setSyncing(true)
    try { const result = await calendarApi.googleSync(); Toast.show({ content: `Синхронізовано: ${result.synced} подій`, icon: 'success' }); loadOccurrences(selectedDate, activeTypes, selectedGroupIds) }
    catch { Toast.show({ content: 'Помилка синхронізації', icon: 'fail' }) }
    finally { setSyncing(false) }
  }

  const toggleType = (t: string) => setActiveTypes((prev) => { const next = new Set(prev); next.has(t) ? next.delete(t) : next.add(t); return next })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fff' }}>
      <NavBar back={null} right={
        <div style={{ display: 'flex', gap: 4 }}>
          {hasPermission('calendar.google.sync') && <button onClick={handleGoogleSync} disabled={syncing} style={{ background: 'none', border: 'none', padding: 4, cursor: syncing ? 'default' : 'pointer', color: TYPE_COLORS.Google, display: 'flex', opacity: syncing ? 0.5 : 1 }}><RedoOutline style={{ fontSize: 20 }} /></button>}
          {hasPermission('calendar.events.manage') && <button onClick={() => { setEditingEvent(null); setFormKey((k) => k + 1); setFormVisible(true) }} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-primary)', display: 'flex' }}><AddOutline style={{ fontSize: 22 }} /></button>}
        </div>
      }>Календар</NavBar>

      <div style={{ padding: '4px 12px 8px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--color-border-light)' }}>
        <FilterPill label="Google" active={activeTypes.has('Google')} onToggle={() => toggleType('Google')} color={TYPE_COLORS.Google} />
        <FilterPill label="Повторювані" active={activeTypes.has('Recurring')} onToggle={() => toggleType('Recurring')} />
        <FilterPill label="Глобальні" active={activeTypes.has('Global')} onToggle={() => toggleType('Global')} color={TYPE_COLORS.Global} />
        <FilterPill label={selectedGroupIds.size > 0 ? `Домашки (${selectedGroupIds.size})` : 'Домашки'} active={selectedGroupIds.size > 0} onToggle={() => setGroupsDrawerVisible(true)} arrow />
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border-light)', padding: '6px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setSelectedDate((p) => addDays(p, -7))} style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0 }}><LeftOutline /></button>
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', marginBottom: 3 }}>
              {stripDays.map((day, i) => {
                const isWeekend = i >= 5
                const isToday = isSameDay(day, today)
                return <div key={i} style={{ width: STRIP_CELL_W, textAlign: 'center', fontSize: 10, fontWeight: 500, lineHeight: 1, color: isToday && !isWeekend ? 'var(--color-primary)' : 'var(--color-text-tertiary)', opacity: isWeekend ? 0.5 : 1 }}>{DAY_ABBR[day.getDay()]}</div>
              })}
            </div>
            <div style={{ display: 'flex', position: 'relative', height: STRIP_CIRCLE }}>
              <div style={{ position: 'absolute', top: 0, left: selOffset * STRIP_CELL_W + STRIP_CELL_PAD, width: 3 * STRIP_CELL_W - 2 * STRIP_CELL_PAD, height: STRIP_CIRCLE, background: 'rgba(0,0,0,0.07)', borderRadius: 9999, pointerEvents: 'none' }} />
              {stripDays.map((day, i) => {
                const isWeekend = i >= 5
                const isSelected = isSameDay(day, selectedDate)
                const isToday = isSameDay(day, today)
                return (
                  <button key={i} onClick={() => { if (!isWeekend) setSelectedDate(day) }} disabled={isWeekend} style={{ width: STRIP_CELL_W, height: STRIP_CIRCLE, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: isWeekend ? 'default' : 'pointer', padding: 0, position: 'relative', zIndex: 1, WebkitTapHighlightColor: 'transparent' }}>
                    <div style={{ width: STRIP_CIRCLE, height: STRIP_CIRCLE, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-primary)' : 'transparent', color: isSelected ? '#fff' : isToday ? 'var(--color-primary)' : isWeekend ? 'var(--color-text-tertiary)' : 'var(--color-text)', opacity: isWeekend ? 0.5 : 1, fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{day.getDate()}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <button onClick={() => setSelectedDate((p) => addDays(p, 7))} style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0 }}><RightOutline /></button>
        </div>
      </div>

      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${TIME_AXIS_WIDTH}px 1fr 1fr 1fr`, position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div />
          {[col0, col1, col2].map((day, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '5px 2px', fontSize: 11, fontWeight: 600, color: isSameDay(day, today) ? 'var(--color-primary)' : 'var(--color-text-secondary)', borderLeft: '1px solid rgba(0,0,0,0.05)' }}>
              {DAY_ABBR[day.getDay()]}, {day.getDate()} {UKR_MONTHS_SHORT[day.getMonth()]}
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: HOUR_HEIGHT * 24, display: 'flex' }}>
          <div style={{ width: TIME_AXIS_WIDTH, flexShrink: 0, position: 'relative' }}>
            {HOURS.map((h) => h > 0 && <div key={h} style={{ position: 'absolute', top: h * HOUR_HEIGHT - 7, right: 6, fontSize: 10, color: 'var(--color-text-tertiary)', lineHeight: 1 }}>{String(h).padStart(2, '0')}:00</div>)}
          </div>
          {[col0, col1, col2].map((day, colIdx) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={colIdx} style={{ flex: 1, position: 'relative', borderLeft: '1px solid rgba(0,0,0,0.05)', backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${HOUR_HEIGHT - 1}px, rgba(0,0,0,0.04) ${HOUR_HEIGHT - 1}px, rgba(0,0,0,0.04) ${HOUR_HEIGHT}px)` }}>
                {isToday && <div style={{ position: 'absolute', top: nowMin * PX_PER_MIN, left: 0, right: 0, zIndex: 4, pointerEvents: 'none' }}><div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: 9999, background: 'var(--color-error)' }} /><div style={{ height: 2, background: 'var(--color-error)' }} /></div>}
                {layoutEvents(eventsFor(day)).map((ev, j) => <EventBlock key={j} ev={ev} onClick={() => handleEventClick(ev)} />)}
              </div>
            )
          })}
        </div>
      </div>

      <Popup visible={groupsDrawerVisible} onMaskClick={() => setGroupsDrawerVisible(false)} position="bottom" bodyStyle={{ borderRadius: '16px 16px 0 0', padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Домашки</div>
        <button onClick={() => setSelectedGroupIds(selectedGroupIds.size === groups.length ? new Set() : new Set(groups.map((g) => g.id)))} style={{ marginBottom: 12, background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}>
          {selectedGroupIds.size === groups.length && groups.length > 0 ? 'Зняти всі' : 'Вибрати всі'}
        </button>
        {groups.map((g) => (
          <div key={g.id} onClick={() => setSelectedGroupIds((prev) => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
            <div style={{ width: 12, height: 12, borderRadius: 9999, background: g.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 15 }}>{g.name}</span>
            <Checkbox checked={selectedGroupIds.has(g.id)} onChange={() => {}} />
          </div>
        ))}
        <Button block color="primary" style={{ marginTop: 16 }} onClick={() => setGroupsDrawerVisible(false)}>Готово</Button>
      </Popup>

      <Popup visible={formVisible} onMaskClick={() => { setFormVisible(false); setEditingEvent(null) }} position="bottom" bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '92vh', overflowY: 'auto' }}>
        <EventForm key={formKey} event={editingEvent} groups={groups} rooms={rooms} defaultDate={formatDate(selectedDate)} onDone={handleFormDone} onCancel={() => { setFormVisible(false); setEditingEvent(null) }} />
      </Popup>
    </div>
  )
}
