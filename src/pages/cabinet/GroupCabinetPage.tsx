import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, List, SpinLoading, Toast, Empty, Popup, Input, Button, Dialog } from 'antd-mobile'
import { EditSOutline, RightOutline, DownOutline, UpOutline, AddOutline, DeleteOutline } from 'antd-mobile-icons'
import { groupsApi } from '@/api/groups'
import { planningApi } from '@/api/planning'
import { churchEventsApi } from '@/api/churchEvents'
import { useAuth } from '@/store/auth'
import type { Group, GroupCabinet, GroupEvent, ChurchEvent } from '@/types'

const ADMIN_ROLES = ['SuperAdmin', 'Admin']

// ── Group selector (for admins) ───────────────────────────────────────────────

function GroupSelector() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>

  return (
    <div>
      <NavBar back={null}>Домашка</NavBar>
      <List style={{ marginTop: 12 }}>
        {groups.map((g) => (
          <List.Item
            key={g.id}
            arrow={<RightOutline />}
            extra={<span style={{ ...tagStyle, color: g.color, background: `${g.color}18` }}>{g.isActive ? 'Активна' : 'Неактивна'}</span>}
            onClick={() => navigate(`/cabinet/${g.id}`)}
          >
            {g.name}
          </List.Item>
        ))}
      </List>
    </div>
  )
}

// ── Cabinet view ──────────────────────────────────────────────────────────────

export function GroupCabinetPage() {
  const { id } = useParams<{ id?: string }>()
  const { user } = useAuth()

  const isAdmin = user?.roles?.some((r) => ADMIN_ROLES.includes(r)) ?? false

  // If no id in URL and user is not admin → use their primary group
  const groupId = id ? Number(id) : (!isAdmin ? user?.primaryGroupId : undefined)

  // Admin without an id in URL → show group selector
  if (!groupId && isAdmin) return <GroupSelector />

  if (!groupId) return (
    <div>
      <NavBar back={null}>Домашка</NavBar>
      <Empty description="Вас не призначено до жодної групи" style={{ marginTop: 60 }} />
    </div>
  )

  return <CabinetView groupId={groupId} isAdmin={isAdmin} />
}

// ── Cabinet content ───────────────────────────────────────────────────────────

function CabinetView({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const navigate = useNavigate()
  const [cabinet, setCabinet] = useState<GroupCabinet | null>(null)
  const [loading, setLoading] = useState(true)
  const [editVisible, setEditVisible] = useState(false)
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [churchEvents, setChurchEvents] = useState<ChurchEvent[]>([])
  const [addEventVisible, setAddEventVisible] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0])
  const [addingEvent, setAddingEvent] = useState(false)
  const [rescheduleVisible, setRescheduleVisible] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const load = () =>
    Promise.all([groupsApi.getCabinet(groupId), groupsApi.getEvents(groupId), churchEventsApi.getAll()])
      .then(([cab, evts, church]) => { setCabinet(cab); setEvents(evts); setChurchEvents(church) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  const handleAddEvent = async () => {
    if (!newEventName.trim() || !newEventDate) return
    const [, m, d] = newEventDate.split('-').map(Number)
    setAddingEvent(true)
    try {
      const evt = await groupsApi.addEvent(groupId, { name: newEventName.trim(), month: m, day: d })
      setEvents((prev) => [...prev, evt].sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5))
      setAddEventVisible(false)
      setNewEventName('')
    } catch {
      Toast.show({ content: 'Помилка', icon: 'fail' })
    }
    setAddingEvent(false)
  }

  const handleReschedule = async () => {
    if (!rescheduleDate) return
    setRescheduling(true)
    try {
      // Pass old date so backend migrates the plan to the new date
      await groupsApi.setNextMeetingDate(groupId, rescheduleDate, nextMeetingDate ?? undefined)
      setRescheduleVisible(false)
      await load()
    } catch {
      Toast.show({ content: 'Помилка', icon: 'fail' })
    }
    setRescheduling(false)
  }

  const handleCancelMeeting = async () => {
    const ok = await Dialog.confirm({
      title: 'Скасувати наступну домашку?',
      content: 'Наступна зустріч зміститься на тиждень пізніше.',
      confirmText: 'Скасувати зустріч',
      cancelText: 'Назад',
    })
    if (!ok) return

    const nextDate = nextMeetingDate
      ? new Date(new Date(nextMeetingDate + 'T00:00:00').getTime() + 7 * 86400000)
          .toISOString().split('T')[0]
      : null
    if (!nextDate) return

    // If a plan exists for the cancelled meeting, ask whether to delete it
    if (hasPlanForNextMeeting && nextMeetingDate) {
      const deletePlan = await Dialog.confirm({
        title: 'Видалити план зустрічі?',
        content: 'У цієї зустрічі є збережений план. Видалити його?',
        confirmText: 'Видалити план',
        cancelText: 'Залишити',
      })
      if (deletePlan) {
        try {
          await planningApi.deletePlanByDate(groupId, nextMeetingDate)
        } catch { /* ignore if plan was already gone */ }
      }
    }

    try {
      await groupsApi.setNextMeetingDate(groupId, nextDate)
      await load()
    } catch {
      Toast.show({ content: 'Помилка', icon: 'fail' })
    }
  }

  const handleDeleteEvent = async (eventId: number) => {
    await groupsApi.deleteEvent(groupId, eventId)
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  useEffect(() => { load() }, [groupId])

  if (loading || !cabinet) return (
    <div>
      <NavBar back={isAdmin ? undefined : null} onBack={isAdmin ? () => navigate('/cabinet') : undefined}>Домашка</NavBar>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
    </div>
  )

  const { group, nextMeetingDate, lastMeetingDate, lastAttendance, upcomingEvents, orgTeam, stats, hasPlanForNextMeeting } = cabinet

  const attendancePct = lastAttendance
    ? Math.round(lastAttendance.present * 100 / (lastAttendance.total || 1))
    : null

  const formatDate = (iso?: string) => {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar back={isAdmin ? undefined : null} onBack={isAdmin ? () => navigate('/cabinet') : undefined}>Домашка</NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* Block 1: Group info */}
        <div style={block}>
          <div style={{ padding: '14px 0 10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</span>
                </div>
                {(group.meetingDay || group.meetingTime) && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                    {[group.meetingDay, group.meetingTime].filter(Boolean).join(' · ')}
                  </div>
                )}
                {group.location && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{group.location}</div>
                )}
              </div>
              <button onClick={() => setEditVisible(true)} style={iconBtn}><EditSOutline style={{ fontSize: 18 }} /></button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <Stat label="Учасників" value={stats.totalMembers} />
              <Stat label="Ср. відвідуваність" value={`${stats.avgAttendanceRate}%`} />
              <Stat label="Нових цього місяця" value={stats.newMembersThisMonth} />
            </div>
          </div>
        </div>

        {/* Block 2: Next meeting */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <SectionLabel>Наступна домашка</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>
                {formatDate(nextMeetingDate) ?? 'Невідомо'}
              </span>
              <Button size="small" fill="outline"
                style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                onClick={() => navigate(`/cabinet/${groupId}/plan${nextMeetingDate ? `?date=${nextMeetingDate}` : ''}`)}>
                Планування
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="mini" fill="outline"
                style={{ '--border-color': 'var(--color-border)', '--text-color': 'var(--color-text-secondary)' } as React.CSSProperties}
                onClick={() => { setRescheduleDate(nextMeetingDate ?? ''); setRescheduleVisible(true) }}>
                Перенести
              </Button>
              <Button size="mini" fill="outline"
                disabled={!nextMeetingDate}
                style={{ '--border-color': 'var(--adm-color-danger)', '--text-color': 'var(--adm-color-danger)' } as React.CSSProperties}
                onClick={() => { handleCancelMeeting() }}>
                Скасувати
              </Button>
              <Button size="mini" fill="solid"
                disabled={!hasPlanForNextMeeting || !group.telegramGroupId}
                style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
                onClick={() => { Toast.show({ content: 'Незабаром' }) }}>
                Повідомити про план
              </Button>
            </div>
          </div>
        </div>

        {/* Block 3: Attendance */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <SectionLabel>Присутність</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {lastMeetingDate
                  ? <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Остання: {formatDate(lastMeetingDate)}</span>
                  : <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Немає зустрічей</span>}
                {lastAttendance && (
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                    {lastAttendance.present}/{lastAttendance.total}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
                      {attendancePct}%
                    </span>
                  </div>
                )}
              </div>
              {lastMeetingDate && (
                <Button size="small" fill="solid"
                  style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
                  onClick={() => navigate(`/cabinet/${groupId}/attendance${lastMeetingDate ? `?date=${lastMeetingDate}` : ''}`)}>
                  Відмітити
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Block 4: Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div style={{ ...block, padding: '14px 16px' }}>
            <SectionLabel>Найближчі події</SectionLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map((ev) => (
                <div key={ev.personId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>🎂 {ev.fullName}</span>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {formatBirthday(ev.dateOfBirth)}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', fontWeight: 600 }}>
                    {ev.daysUntil === 0 ? 'Сьогодні!' : `за ${ev.daysUntil} дн.`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block 5: Org team */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <SectionLabel>Орг команда</SectionLabel>
          {orgTeam.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8, display: 'block' }}>Немає призначених адмінів</span>
            : orgTeam.map((member) => <OrgMemberRow key={member.id} member={member} />)
          }
        </div>

        {/* Block 6: Custom events */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Найближчі події</SectionLabel>
            <button onClick={() => setAddEventVisible(true)} style={{ ...iconBtn, color: 'var(--color-primary)' }}>
              <AddOutline style={{ fontSize: 18 }} />
            </button>
          </div>
          {events.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'block' }}>Немає запланованих подій</span>
          ) : events.map((ev) => (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 8px', marginBottom: 2, borderRadius: 8,
              background: ev.daysUntil <= 7 ? 'rgba(52, 199, 89, 0.08)' : 'transparent',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{ev.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{formatEventDate(ev.month, ev.day)}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', marginRight: 10 }}>
                {ev.daysUntil === 0 ? 'Сьогодні!' : ev.daysUntil === 1 ? 'Завтра' : `за ${ev.daysUntil} дн.`}
              </span>
              <button onClick={() => handleDeleteEvent(ev.id)} style={{ ...iconBtn, color: 'var(--color-error)', padding: 2 }}>
                <DeleteOutline style={{ fontSize: 16 }} />
              </button>
            </div>
          ))}
        </div>

        {/* Add event popup */}
        <Popup visible={addEventVisible} onMaskClick={() => setAddEventVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нова подія</div>
          <FormField label="Назва">
            <Input value={newEventName} onChange={setNewEventName} placeholder="Назва події" autoFocus />
          </FormField>
          <FormField label="Дата">
            <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)}
              style={{ ...nativeSelect, padding: 0 }} />
          </FormField>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button block loading={addingEvent} onClick={handleAddEvent}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Додати
            </Button>
            <Button block fill="outline" onClick={() => setAddEventVisible(false)}>Скасувати</Button>
          </div>
        </Popup>

        {/* Church calendar */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <SectionLabel>Церковний календар</SectionLabel>
          {churchEvents.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'block', marginTop: 8 }}>Подій немає</span>
          ) : churchEvents.map((ev) => (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 8px', marginBottom: 2, borderRadius: 8,
              background: ev.daysUntil <= 7 ? 'rgba(52, 199, 89, 0.08)' : 'transparent',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{ev.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{formatEventDate(ev.month, ev.day)}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                {ev.daysUntil === 0 ? 'Сьогодні!' : ev.daysUntil === 1 ? 'Завтра' : `за ${ev.daysUntil} дн.`}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionLabel>Статистика</SectionLabel>
              <Button size="mini" fill="none"
                style={{ '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                disabled>
                Деталі →
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <StatCard label="Ср. відвідуваність" value={`${stats.avgAttendanceRate}%`} />
              <StatCard label="Нових цього місяця" value={`${stats.newMembersThisMonth}`} />
              <StatCard label="Всього учасників" value={`${stats.totalMembers}`} />
            </div>
          </div>
        </div>

      </div>

      {/* Reschedule popup */}
      <Popup visible={rescheduleVisible} onMaskClick={() => setRescheduleVisible(false)}
        bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Перенести домашку</div>
        <FormField label="Нова дата">
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            style={{ ...nativeSelect, padding: 0 }}
          />
        </FormField>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <Button block loading={rescheduling} onClick={handleReschedule}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Перенести
          </Button>
          <Button block fill="outline" onClick={() => setRescheduleVisible(false)}>Назад</Button>
        </div>
      </Popup>

      {/* Edit group info popup */}
      <EditGroupPopup
        group={group}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={() => { setEditVisible(false); load() }}
      />
    </div>
  )
}

// ── Org member row with collapse ──────────────────────────────────────────────

function OrgMemberRow({ member }: { member: GroupCabinet['orgTeam'][0] }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{fullName}</span>
            {member.role && (
              <span style={{
                fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '1px 6px',
                color: member.role.color, background: `${member.role.color}20`,
              }}>
                {member.role.name}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {member.overseeCount} під опікою
            </span>
          </div>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {open ? <UpOutline /> : <DownOutline />}
          </span>
        </div>
      </button>
      {open && member.oversees.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: '2px solid var(--color-border-light)' }}>
          {member.oversees.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{p.fullName}</span>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/people/${p.id}`) }}
                style={{ ...iconBtn, padding: 4, color: 'var(--color-primary)' }}>
                <RightOutline style={{ fontSize: 13 }} />
              </button>
            </div>
          ))}
        </div>
      )}
      {open && member.oversees.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', paddingLeft: 12, marginTop: 4 }}>
          Немає людей під опікою
        </div>
      )}
    </div>
  )
}

// ── Edit group popup ──────────────────────────────────────────────────────────

const MEETING_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

function EditGroupPopup({ group, visible, onClose, onSaved }: {
  group: GroupCabinet['group']
  visible: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(group.name)
  const [meetingDay, setMeetingDay] = useState(group.meetingDay ?? '')
  const [meetingTime, setMeetingTime] = useState(group.meetingTime ?? '')
  const [location, setLocation] = useState(group.location ?? '')
  const [telegramGroupId, setTelegramGroupId] = useState(group.telegramGroupId ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setName(group.name)
      setMeetingDay(group.meetingDay ?? '')
      setMeetingTime(group.meetingTime ?? '')
      setLocation(group.location ?? '')
      setTelegramGroupId(group.telegramGroupId ?? '')
    }
  }, [visible, group])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const current = await groupsApi.getById(group.id)
      await groupsApi.update(group.id, {
        ...current,
        name: name.trim(),
        meetingDay: meetingDay || undefined,
        meetingTime: meetingTime || undefined,
        location: location.trim() || undefined,
        telegramGroupId: telegramGroupId.trim() || undefined,
      })
      onSaved()
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    }
    setSaving(false)
  }

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Редагувати групу</div>

      <FormField label="Назва групи">
        <Input value={name} onChange={setName} placeholder="Назва" />
      </FormField>
      <FormField label="День домашки">
        <select value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} style={nativeSelect}>
          <option value="">— не вибрано —</option>
          {MEETING_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </FormField>
      <FormField label="Час">
        <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)}
          style={{ ...nativeSelect, padding: 0 }} />
      </FormField>
      <FormField label="Адреса">
        <Input value={location} onChange={setLocation} placeholder="Адреса зустрічі" />
      </FormField>
      <FormField label="ID групи в Telegram">
        <Input value={telegramGroupId} onChange={setTelegramGroupId} placeholder="-1001234567890" />
      </FormField>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button block loading={saving} onClick={handleSave}
          style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
          Зберегти
        </Button>
        <Button block fill="outline" onClick={onClose}>Скасувати</Button>
      </div>
    </Popup>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={inputWrap}>{children}</div>
    </div>
  )
}

function formatBirthday(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

function formatEventDate(month: number, day: number) {
  return new Date(2000, month - 1, day).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '0 16px', marginTop: 16,
  boxShadow: 'var(--shadow-sm)',
}
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 4,
  cursor: 'pointer', color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center',
}
const nativeSelect: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', fontSize: 15, color: 'var(--color-text)',
}
const tagStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  borderRadius: 6, padding: '2px 7px',
}
