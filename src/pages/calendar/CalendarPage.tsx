import { useEffect, useRef, useState } from 'react'
import { NavBar, Popup, Toast, Dialog, Button, Checkbox } from 'antd-mobile'
import { AddOutline, LeftOutline, RightOutline } from 'antd-mobile-icons'
import { calendarApi, roomsApi, type CalendarEventPayload } from '@/api/calendar'
import { groupsApi } from '@/api/groups'
import type { CalendarOccurrence, CalendarEvent, Room, Group } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 48
const PX_PER_MIN = HOUR_HEIGHT / 60
const TIME_AXIS_WIDTH = 44
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const DAY_ABBR = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const UKR_MONTHS_SHORT = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру']
const UKR_DAYS_FULL = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота']

const TYPE_COLORS: Record<string, string> = {
  Recurring: '#2AAFCA',
  Global: '#F59E0B',
  HomeGroup: '#8B5CF6',
}
const TYPE_LABELS: Record<string, string> = {
  Recurring: 'Повторювані',
  Global: 'Глобальні',
  HomeGroup: 'Домашки',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b)
}

function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function eventColor(o: CalendarOccurrence): string {
  if (o.type === 'HomeGroup' && o.homeGroupColor) return o.homeGroupColor
  return TYPE_COLORS[o.type] ?? '#6B7280'
}

// ── Overlap layout ────────────────────────────────────────────────────────────

type Laid = CalendarOccurrence & { lane: number; totalLanes: number }

function layoutEvents(events: CalendarOccurrence[]): Laid[] {
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 4 }}>
        {label}
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
        background: `${color}18`,
        border: 'none',
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 4px 4px 0',
        padding: '2px 5px', overflow: 'hidden',
        textAlign: 'left', cursor: 'pointer',
        zIndex: 2, WebkitTapHighlightColor: 'transparent',
        outline: 'none',
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
  })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const isRecurring = event ? event.isRecurring : form.type === 'Recurring'

  const buildPayload = (): CalendarEventPayload => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    location: form.location.trim() || null,
    roomId: form.roomId ? Number(form.roomId) : null,
    type: form.type,
    homeGroupId: form.type === 'HomeGroup' && form.homeGroupId ? Number(form.homeGroupId) : null,
    isRecurring,
    recurringDayOfWeek: isRecurring ? Number(form.recurringDayOfWeek) : null,
    startTime: form.startTime || null,
    endTime: form.endTime || null,
    date: !isRecurring ? form.date : null,
  })

  const handleSave = async () => {
    if (!form.title.trim()) return Toast.show({ content: 'Введіть назву', icon: 'fail' })
    setSaving(true)
    try {
      if (event) await calendarApi.update(event.id, buildPayload())
      else await calendarApi.create(buildPayload())
      Toast.show({ content: event ? 'Збережено' : 'Створено', icon: 'success' })
      onDone()
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!event) return
    Dialog.confirm({
      content: 'Видалити подію?',
      onConfirm: async () => {
        try {
          await calendarApi.delete(event.id)
          Toast.show({ content: 'Видалено', icon: 'success' })
          onDone()
        } catch {
          Toast.show({ content: 'Помилка видалення', icon: 'fail' })
        }
      },
    })
  }

  const isAutoHomeGroup = event?.type === 'HomeGroup' && event?.isRecurring

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>
          {event ? 'Редагувати подію' : 'Нова подія'}
        </span>
        {event && (
          <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}>
            Видалити
          </button>
        )}
      </div>

      {isAutoHomeGroup && (
        <div style={{ padding: '8px 12px', background: '#F59E0B18', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#B45309' }}>
          Авто-подія домашньої групи. Час зустрічі змінюється в налаштуваннях групи.
        </div>
      )}

      <FormField label="Тип">
        <div style={{ display: 'flex', gap: 6 }}>
          {(['Recurring', 'Global', 'HomeGroup'] as const).map((t) => (
            <button key={t} onClick={() => set('type', t)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${form.type === t ? TYPE_COLORS[t] : 'var(--color-border)'}`,
              background: form.type === t ? `${TYPE_COLORS[t]}18` : 'transparent',
              color: form.type === t ? TYPE_COLORS[t] : 'var(--color-text-secondary)',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </FormField>

      {form.type === 'HomeGroup' && (
        <FormField label="Домашня група">
          <select value={form.homeGroupId} onChange={(e) => set('homeGroupId', e.target.value)} style={inputStyle}>
            <option value="">— Вибрати групу —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </FormField>
      )}

      <FormField label="Назва">
        <input value={form.title} onChange={(e) => set('title', e.target.value)}
          placeholder="Назва події" style={inputStyle} />
      </FormField>

      <FormField label="Опис">
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          placeholder="Необов'язково" rows={2} style={{ ...inputStyle, resize: 'none' }} />
      </FormField>

      <FormField label="Локація">
        <input value={form.location} onChange={(e) => set('location', e.target.value)}
          placeholder="Де відбудеться?" style={inputStyle} />
      </FormField>

      {rooms.length > 0 && (
        <FormField label="Кімната (бронювання)">
          <select value={form.roomId} onChange={(e) => set('roomId', e.target.value)} style={inputStyle}>
            <option value="">— Без кімнати —</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
      )}

      {isRecurring ? (
        <FormField label="День тижня">
          <select value={form.recurringDayOfWeek} onChange={(e) => set('recurringDayOfWeek', e.target.value)} style={inputStyle}>
            {UKR_DAYS_FULL.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
        </FormField>
      ) : (
        <FormField label="Дата">
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={inputStyle} />
        </FormField>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <FormField label="Початок">
          <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Кінець">
          <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button block fill="outline" onClick={onCancel}>Скасувати</Button>
        <Button block color="primary" loading={saving} onClick={() => { handleSave() }}>
          {event ? 'Зберегти' : 'Створити'}
        </Button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([])
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(['Recurring', 'Global', 'HomeGroup']))
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set())
  const [groups, setGroups] = useState<Group[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [groupsDrawerVisible, setGroupsDrawerVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const col0 = selectedDate
  const col1 = addDays(selectedDate, 1)
  const col2 = addDays(selectedDate, 2)

  useEffect(() => {
    groupsApi.getAll().then(setGroups)
    roomsApi.getAll().then(setRooms)
  }, [])

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  const loadOccurrences = (date: Date, types: Set<string>, groupIds: Set<number>) => {
    if (types.size === 0) { setOccurrences([]); return }
    calendarApi.getOccurrences({
      from: formatDate(date),
      to: formatDate(addDays(date, 2)),
      types: [...types].join(','),
      groupIds: groupIds.size > 0 ? [...groupIds].join(',') : undefined,
    }).then(setOccurrences).catch(() => {})
  }

  useEffect(() => {
    loadOccurrences(selectedDate, activeTypes, selectedGroupIds)
  }, [selectedDate, activeTypes, selectedGroupIds])

  const eventsFor = (d: Date) => occurrences.filter((o) => o.date === formatDate(d))

  const handleEventClick = async (o: CalendarOccurrence) => {
    try {
      const ev = await calendarApi.getEvent(o.eventId)
      setEditingEvent(ev)
      setFormVisible(true)
    } catch {
      Toast.show({ content: 'Помилка завантаження', icon: 'fail' })
    }
  }

  const handleFormDone = () => {
    setFormVisible(false)
    setEditingEvent(null)
    loadOccurrences(selectedDate, activeTypes, selectedGroupIds)
  }

  const toggleType = (t: string) => setActiveTypes((prev) => {
    const next = new Set(prev)
    next.has(t) ? next.delete(t) : next.add(t)
    return next
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fff' }}>
      {/* Header */}
      <NavBar back={null} right={
        <button onClick={() => { setEditingEvent(null); setFormVisible(true) }}
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-primary)', display: 'flex' }}>
          <AddOutline style={{ fontSize: 22 }} />
        </button>
      }>
        Календар
      </NavBar>

      {/* Filter bar */}
      <div style={{ padding: '4px 12px 8px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--color-border-light)' }}>
        <FilterPill label="Google" active={false} onToggle={() => {}} disabled />
        <FilterPill label="Повторювані" active={activeTypes.has('Recurring')} onToggle={() => toggleType('Recurring')} />
        <FilterPill
          label="Глобальні" active={activeTypes.has('Global')}
          onToggle={() => toggleType('Global')} color={TYPE_COLORS.Global}
        />
        <FilterPill
          label={selectedGroupIds.size > 0 ? `Домашки (${selectedGroupIds.size})` : 'Домашки'}
          active={selectedGroupIds.size > 0}
          onToggle={() => setGroupsDrawerVisible(true)}
          arrow
        />
      </div>

      {/* Day strip — 7 days, first 3 in pill, today with circle */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border-light)', padding: '6px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setSelectedDate((p) => addDays(p, -1))}
            style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
            <LeftOutline />
          </button>

          {/* Active 3 days — grouped in a pill */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.07)', borderRadius: 9999, padding: '3px 2px', flexShrink: 0 }}>
            {[col0, col1, col2].map((day, i) => {
              const isToday = isSameDay(day, today)
              return (
                <button key={i} onClick={() => setSelectedDate(day)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    width: 44, padding: '2px 0',
                    border: 'none', cursor: 'pointer',
                    background: 'none', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1, color: 'var(--color-text-secondary)' }}>
                    {DAY_ABBR[day.getDay()]}
                  </span>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 9999,
                    background: isToday ? 'var(--color-primary)' : 'transparent',
                    fontSize: 17, fontWeight: 700, lineHeight: 1,
                    color: isToday ? '#fff' : 'var(--color-text)',
                  }}>
                    {day.getDate()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Next 4 days — plain */}
          {[3, 4, 5, 6].map((offset) => {
            const day = addDays(selectedDate, offset)
            const isToday = isSameDay(day, today)
            return (
              <button key={offset} onClick={() => setSelectedDate(day)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  flex: 1, padding: '5px 0',
                  border: 'none', cursor: 'pointer',
                  background: 'none', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 400, lineHeight: 1, color: 'var(--color-text-tertiary)' }}>
                  {DAY_ABBR[day.getDay()]}
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 9999,
                  background: isToday ? 'var(--color-primary)' : 'transparent',
                  fontSize: 15, fontWeight: 400, lineHeight: 1,
                  color: isToday ? '#fff' : 'var(--color-text-tertiary)',
                }}>
                  {day.getDate()}
                </span>
              </button>
            )
          })}

          <button onClick={() => setSelectedDate((p) => addDays(p, 1))}
            style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
            <RightOutline />
          </button>
        </div>
      </div>

      {/* Time grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {/* Sticky column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: `${TIME_AXIS_WIDTH}px 1fr 1fr 1fr`,
          position: 'sticky', top: 0, background: '#fff', zIndex: 10,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div />
          {[col0, col1, col2].map((day, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '5px 2px', fontSize: 11, fontWeight: 600,
              color: isSameDay(day, today) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderLeft: '1px solid rgba(0,0,0,0.05)',
            }}>
              {DAY_ABBR[day.getDay()]}, {day.getDate()} {UKR_MONTHS_SHORT[day.getMonth()]}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div style={{ position: 'relative', height: HOUR_HEIGHT * 24, display: 'flex' }}>
          {/* Time axis */}
          <div style={{ width: TIME_AXIS_WIDTH, flexShrink: 0, position: 'relative' }}>
            {HOURS.map((h) => h > 0 && (
              <div key={h} style={{
                position: 'absolute', top: h * HOUR_HEIGHT - 7, right: 6,
                fontSize: 10, color: 'var(--color-text-tertiary)', lineHeight: 1,
              }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {[col0, col1, col2].map((day, colIdx) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={colIdx} style={{
                flex: 1, position: 'relative',
                borderLeft: '1px solid rgba(0,0,0,0.05)',
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${HOUR_HEIGHT - 1}px, rgba(0,0,0,0.04) ${HOUR_HEIGHT - 1}px, rgba(0,0,0,0.04) ${HOUR_HEIGHT}px)`,
              }}>
                {isToday && (
                  <div style={{ position: 'absolute', top: nowMin * PX_PER_MIN, left: 0, right: 0, zIndex: 4, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: 9999, background: 'var(--color-error)' }} />
                    <div style={{ height: 2, background: 'var(--color-error)' }} />
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

      {/* Groups filter drawer */}
      <Popup
        visible={groupsDrawerVisible}
        onMaskClick={() => setGroupsDrawerVisible(false)}
        position="bottom"
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: 16, maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Домашки</div>
        <button
          onClick={() => setSelectedGroupIds(selectedGroupIds.size === groups.length ? new Set() : new Set(groups.map((g) => g.id)))}
          style={{ marginBottom: 12, background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}
        >
          {selectedGroupIds.size === groups.length && groups.length > 0 ? 'Зняти всі' : 'Вибрати всі'}
        </button>
        {groups.map((g) => (
          <div key={g.id}
            onClick={() => setSelectedGroupIds((prev) => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 9999, background: g.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 15 }}>{g.name}</span>
            <Checkbox checked={selectedGroupIds.has(g.id)} onChange={() => {}} />
          </div>
        ))}
        <Button block color="primary" style={{ marginTop: 16 }} onClick={() => setGroupsDrawerVisible(false)}>
          Готово
        </Button>
      </Popup>

      {/* Event form */}
      <Popup
        visible={formVisible}
        onMaskClick={() => { setFormVisible(false); setEditingEvent(null) }}
        position="bottom"
        bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <EventForm
          event={editingEvent}
          groups={groups}
          rooms={rooms}
          defaultDate={formatDate(selectedDate)}
          onDone={handleFormDone}
          onCancel={() => { setFormVisible(false); setEditingEvent(null) }}
        />
      </Popup>
    </div>
  )
}
