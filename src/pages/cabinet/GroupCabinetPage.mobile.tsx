import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, List, SpinLoading, Toast, Empty, Popup, Input, Button, Dialog, Switch, ActionSheet } from 'antd-mobile'
import { EditSOutline, RightOutline, DownOutline, UpOutline, AddOutline, DeleteOutline, SetOutline } from 'antd-mobile-icons'
import { useAuth } from '@/store/auth'
import { usePermission, usePermissions } from '@/hooks/usePermission'
import { useCabinetData, computePrevMeetingDate, formatDateUk, formatBirthday, formatEventDate } from './useCabinetData'
import { groupsApi } from '@/api/groups'
import type { Group, GroupCabinet, GroupEvent, GroupMember, GroupNeed, Room, CabinetCalendarEvent, TimelineEvent } from '@/types'

const ADMIN_ROLES = ['SuperAdmin', 'Admin']

const NOTIF_ITEMS = [
  { key: 'eventSevenDays', label: 'Подія за 7 днів',       description: 'Нагадування за тиждень до події' },
  { key: 'eventDay',       label: 'В день події',           description: 'Нагадування вранці в день події' },
  { key: 'conflict',       label: 'Накладка у розкладі',    description: 'Якщо час домашки збігається з іншою подією' },
  { key: 'conflictResolved', label: 'Накладку усунено',     description: 'Коли конфлікт розкладу вирішено' },
  { key: 'attendanceAsk', label: 'Відмітка присутніх',      description: 'Запит через годину після початку домашки' },
  { key: 'needsRecordingAsk', label: 'Запис потреб',        description: 'Запит за 30 хв до кінця домашки' },
]

// ── Group selector ────────────────────────────────────────────────────────────

function GroupSelectorMobile() {
  const navigate = useNavigate()
  const { groupsApi: _api } = { groupsApi: null }
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('@/api/groups').then(({ groupsApi }) =>
      groupsApi.getAll().then(setGroups).finally(() => setLoading(false))
    )
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

// ── Top-level page ────────────────────────────────────────────────────────────

export function GroupCabinetPageMobile() {
  const { id } = useParams<{ id?: string }>()
  const { user } = useAuth()
  const isAdmin = user?.roles?.some((r) => ADMIN_ROLES.includes(r)) ?? false
  const groupId = id ? Number(id) : (!isAdmin ? user?.primaryGroupId : undefined)

  if (!groupId && isAdmin) return <GroupSelectorMobile />
  if (!groupId) return (
    <div>
      <NavBar back={null}>Домашка</NavBar>
      <Empty description="Вас не призначено до жодної групи" style={{ marginTop: 60 }} />
    </div>
  )
  return <CabinetViewMobile groupId={groupId} isAdmin={isAdmin} />
}

// ── Cabinet content ───────────────────────────────────────────────────────────

function CabinetViewMobile({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const navigate = useNavigate()
  const perms = usePermissions([
    'groups.edit', 'groups.nextMeeting.manage', 'groups.schedule.manage', 'groups.events.manage',
    'groups.members.manage', 'attendance.record', 'planning.view',
    'planning.edit', 'planning.sendToTelegram',
  ])
  const {
    cabinet, rooms, events, needs, members, loading, reload,
    busyRoomIds, addEvent, updateEvent, deleteEvent,
    reschedule, skipMeeting, deletePlan, bookRoom, sendPlan,
    notifSettings, updateNotifSettings,
    addNeed, updateNeed, deleteNeed,
    setMemberJoinedAt, setMemberLeftAt, transferMember, removeMemberFromGroup,
  } = useCabinetData(groupId)

  const [editVisible, setEditVisible] = useState(false)
  const [addEventVisible, setAddEventVisible] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0])
  const [addingEvent, setAddingEvent] = useState(false)
  const [editEventVisible, setEditEventVisible] = useState(false)
  const [editingEvent, setEditingEvent] = useState<GroupEvent | null>(null)
  const [editEventName, setEditEventName] = useState('')
  const [editEventDate, setEditEventDate] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)
  const [rescheduleVisible, setRescheduleVisible] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [roomPickerVisible, setRoomPickerVisible] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [autoBook, setAutoBook] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [sendingPlan, setSendingPlan] = useState(false)

  const [addNeedVisible, setAddNeedVisible] = useState(false)
  const [newNeedSubject, setNewNeedSubject] = useState('')
  const [newNeedDesc, setNewNeedDesc] = useState('')
  const [newNeedPersonId, setNewNeedPersonId] = useState<number | null>(null)
  const [newNeedUserId, setNewNeedUserId] = useState<number | null>(null)
  const [addingNeed, setAddingNeed] = useState(false)
  const [editNeedVisible, setEditNeedVisible] = useState(false)
  const [editingNeed, setEditingNeed] = useState<GroupNeed | null>(null)
  const [editNeedSubject, setEditNeedSubject] = useState('')
  const [editNeedDesc, setEditNeedDesc] = useState('')
  const [editNeedPersonId, setEditNeedPersonId] = useState<number | null>(null)
  const [editNeedUserId, setEditNeedUserId] = useState<number | null>(null)
  const [savingNeed, setSavingNeed] = useState(false)
  const [needStatusPickerId, setNeedStatusPickerId] = useState<number | null>(null)
  const [joinDateMember, setJoinDateMember] = useState<GroupMember | null>(null)
  const [joinDateValue, setJoinDateValue] = useState('')
  const [savingJoinDate, setSavingJoinDate] = useState(false)

  const [leftDateMember, setLeftDateMember] = useState<GroupMember | null>(null)
  const [leftDateValue, setLeftDateValue] = useState('')
  const [savingLeftDate, setSavingLeftDate] = useState(false)

  const [transferTarget, setTransferTarget] = useState<GroupMember | null>(null)
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [transferToGroupId, setTransferToGroupId] = useState<number | null>(null)
  const [transferring, setTransferring] = useState(false)

  const [historyMember, setHistoryMember] = useState<GroupMember | null>(null)
  const [historyEvents, setHistoryEvents] = useState<TimelineEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const handleViewHistory = async (member: GroupMember) => {
    setHistoryMember(member)
    setHistoryLoading(true)
    setHistoryEvents([])
    try {
      const events = member.isAdmin
        ? await groupsApi.getAdminMemberTimeline(groupId, member.userId!)
        : await groupsApi.getMemberTimeline(groupId, member.id)
      setHistoryEvents(events)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleOpenTransfer = async (member: GroupMember) => {
    setTransferTarget(member)
    setTransferToGroupId(null)
    if (allGroups.length === 0) {
      const gs = await import('@/api/groups').then(({ groupsApi: api }) => api.getAll())
      setAllGroups(gs.filter((g) => g.id !== groupId))
    }
  }

  const handleConfirmTransfer = async () => {
    if (!transferTarget || !transferToGroupId) return
    setTransferring(true)
    try {
      await transferMember(
        transferTarget.isAdmin ? null : transferTarget.id,
        transferTarget.isAdmin ? (transferTarget.userId ?? null) : null,
        transferToGroupId,
      )
      setTransferTarget(null)
      Toast.show({ content: 'Переведено', icon: 'success' })
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setTransferring(false)
  }

  const handleRemoveMember = async (member: GroupMember) => {
    const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
    const ok = await Dialog.confirm({
      title: `Вилучити ${fullName} з домашки?`,
      content: 'Людина більше не буде прив\'язана до жодної домашки.',
      confirmText: 'Вилучити',
      cancelText: 'Скасувати',
    })
    if (!ok) return
    try {
      await removeMemberFromGroup(member.id)
      Toast.show({ content: 'Вилучено', icon: 'success' })
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
  }

  const [memberPickerVisible, setMemberPickerVisible] = useState(false)
  const [memberPickerTarget, setMemberPickerTarget] = useState<'add' | 'edit'>('add')
  const [memberSearch, setMemberSearch] = useState('')
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const handleAddEvent = async () => {
    if (!newEventName.trim() || !newEventDate) return
    const [, m, d] = newEventDate.split('-').map(Number)
    setAddingEvent(true)
    try { await addEvent(newEventName.trim(), m, d); setAddEventVisible(false); setNewEventName('') }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setAddingEvent(false)
  }

  const handleReschedule = async () => {
    if (!rescheduleDate) return
    setRescheduling(true)
    try { await reschedule(rescheduleDate, nextMeetingDate ?? undefined, rescheduleTime || undefined); setRescheduleVisible(false) }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setRescheduling(false)
  }

  const handleCancelMeeting = async () => {
    const ok = await Dialog.confirm({
      title: 'Скасувати наступну домашку?',
      content: 'Наступна зустріч зміститься на наступний день тижня.',
      confirmText: 'Скасувати зустріч',
      cancelText: 'Назад',
    })
    if (!ok) return
    if (hasPlanForNextMeeting && nextMeetingDate) {
      const del = await Dialog.confirm({
        title: 'Видалити план зустрічі?', content: 'У цієї зустрічі є збережений план. Видалити його?',
        confirmText: 'Видалити план', cancelText: 'Залишити',
      })
      if (del) await deletePlan(nextMeetingDate)
    }
    try { await skipMeeting(false, undefined) }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
  }

  const openEditEvent = (ev: GroupEvent) => {
    setEditingEvent(ev)
    setEditEventName(ev.name)
    const y = ev.year ?? new Date().getFullYear()
    setEditEventDate(`${y}-${String(ev.month).padStart(2, '0')}-${String(ev.day).padStart(2, '0')}`)
    setEditEventVisible(true)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent || !editEventName.trim() || !editEventDate) return
    const [y, m, d] = editEventDate.split('-').map(Number)
    setSavingEvent(true)
    try { await updateEvent(editingEvent.id, editEventName.trim(), m, d, y); setEditEventVisible(false) }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setSavingEvent(false)
  }

  const handleBookRoom = async () => {
    if (!nextMeetingDate) return
    setBookingLoading(true)
    try {
      await bookRoom(nextMeetingDate, selectedRoomId, autoBook)
      setRoomPickerVisible(false)
      Toast.show({ content: selectedRoomId ? 'Кімнату заброньовано' : 'Бронювання скасовано', icon: 'success' })
    } catch { Toast.show({ content: 'Помилка бронювання', icon: 'fail' }) }
    setBookingLoading(false)
  }

  const openMemberPicker = async (target: 'add' | 'edit') => {
    setMemberPickerTarget(target)
    setMemberSearch('')
    setMemberPickerVisible(true)
    if (groupMembers.length === 0) {
      setMembersLoading(true)
      try { setGroupMembers(await groupsApi.getMembers(groupId)) }
      catch { /* ignore */ }
      setMembersLoading(false)
    }
  }

  const handleMemberSelect = (member: GroupMember) => {
    const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
    if (memberPickerTarget === 'add') {
      setNewNeedSubject(fullName)
      setNewNeedPersonId(member.isAdmin ? null : member.id)
      setNewNeedUserId(member.isAdmin ? (member.userId ?? null) : null)
    } else {
      setEditNeedSubject(fullName)
      setEditNeedPersonId(member.isAdmin ? null : member.id)
      setEditNeedUserId(member.isAdmin ? (member.userId ?? null) : null)
    }
    setMemberPickerVisible(false)
  }

  const handleAddNeed = async () => {
    if (!newNeedSubject.trim() || !newNeedDesc.trim()) return
    setAddingNeed(true)
    try {
      await addNeed(newNeedSubject.trim(), newNeedDesc.trim(), newNeedPersonId, newNeedUserId)
      setAddNeedVisible(false); setNewNeedSubject(''); setNewNeedDesc(''); setNewNeedPersonId(null); setNewNeedUserId(null)
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setAddingNeed(false)
  }

  const openEditNeed = (need: GroupNeed) => {
    setEditingNeed(need)
    setEditNeedSubject(need.subjectName)
    setEditNeedDesc(need.description)
    setEditNeedPersonId(need.personId ?? null)
    setEditNeedUserId(need.userId ?? null)
    setEditNeedVisible(true)
  }

  const handleUpdateNeed = async () => {
    if (!editingNeed || !editNeedSubject.trim() || !editNeedDesc.trim()) return
    setSavingNeed(true)
    try { await updateNeed(editingNeed.id, editNeedSubject.trim(), editNeedDesc.trim(), editingNeed.status, editNeedPersonId, editNeedUserId); setEditNeedVisible(false) }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setSavingNeed(false)
  }

  const handleDeleteNeed = async (id: number) => {
    const ok = await Dialog.confirm({ title: 'Видалити потребу?', confirmText: 'Видалити', cancelText: 'Скасувати' })
    if (!ok) return
    try { await deleteNeed(id) }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
  }

  const handleNeedStatusChange = async (need: GroupNeed, status: string) => {
    try { await updateNeed(need.id, need.subjectName, need.description, status, need.personId, need.userId) }
    catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
  }

  if (loading || !cabinet) return (
    <div>
      <NavBar back={isAdmin ? undefined : null} onBack={isAdmin ? () => navigate('/cabinet') : undefined}>Домашка</NavBar>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
    </div>
  )

  const { group, nextMeetingDate, lastMeetingDate, lastAttendance, upcomingEvents, orgTeam, stats,
    hasPlanForNextMeeting, nextMeetingRoomId, nextMeetingEvents, nextMeetingConflicts } = cabinet

  const attendancePct = lastAttendance ? Math.round(lastAttendance.present * 100 / (lastAttendance.total || 1)) : null
  const attendanceDate = cabinet?.prevScheduledMeetingDate ?? lastMeetingDate ?? computePrevMeetingDate(group.meetingDay)
  const bookedRoom = rooms.find((r) => r.id === nextMeetingRoomId)
  const hasConflicts = (nextMeetingConflicts?.length ?? 0) > 0

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
                    {[group.meetingDay, group.meetingTime, group.meetingEndTime && `— ${group.meetingEndTime}`].filter(Boolean).join(' ')}
                  </div>
                )}
                {group.location && <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{group.location}</div>}
              </div>
              {perms['groups.edit'] && <button onClick={() => setEditVisible(true)} style={iconBtn}><EditSOutline style={{ fontSize: 18 }} /></button>}
            </div>
          </div>
        </div>

        {/* Conflict warning */}
        {hasConflicts && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FFF3CD', border: '1px solid #FBBF24', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>{bookedRoom ? `Конфлікт бронювання — ${bookedRoom.name}` : 'Накладення по часу'}</div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>{nextMeetingConflicts!.map((e) => e.title).join(', ')} накладається на час зустрічі</div>
            </div>
          </div>
        )}

        {/* Block 2: Next meeting */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <SectionLabel>Наступна домашка</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>{formatDateUk(nextMeetingDate) ?? 'Невідомо'}</span>
              {perms['planning.view'] && (
                <Button size="small" fill="outline" style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                  onClick={() => navigate(`/cabinet/${groupId}/plan${nextMeetingDate ? `?date=${nextMeetingDate}` : ''}`)}>Планування</Button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Кімната:</span>
                {bookedRoom ? <span style={{ ...tagStyle, color: bookedRoom.color, background: `${bookedRoom.color}18`, fontSize: 12 }}>{bookedRoom.name}</span> : <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>не заброньовано</span>}
                {hasConflicts && <span style={{ fontSize: 14 }}>⚠️</span>}
                {cabinet.autoBookEnabled && <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600 }}>авто</span>}
              </div>
              <Button size="mini" fill="outline" disabled={!nextMeetingDate}
                style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                onClick={() => { setSelectedRoomId(nextMeetingRoomId ?? null); setAutoBook(cabinet.autoBookEnabled); setRoomPickerVisible(true) }}>Бронювати</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {perms['groups.nextMeeting.manage'] && (
                <Button size="mini" fill="outline" style={{ '--border-color': 'var(--color-border)', '--text-color': 'var(--color-text-secondary)' } as React.CSSProperties}
                  onClick={() => { setRescheduleDate(nextMeetingDate ?? ''); setRescheduleTime(group.meetingTime ?? ''); setRescheduleVisible(true) }}>Перенести</Button>
              )}
              {perms['groups.nextMeeting.manage'] && (
                <Button size="mini" fill="outline" disabled={!nextMeetingDate}
                  style={{ '--border-color': 'var(--adm-color-danger)', '--text-color': 'var(--adm-color-danger)' } as React.CSSProperties}
                  onClick={handleCancelMeeting}>Скасувати</Button>
              )}
              {perms['groups.schedule.manage'] && (
                <Button size="mini" fill="outline"
                  style={{ '--border-color': 'var(--color-border)', '--text-color': 'var(--color-text-secondary)' } as React.CSSProperties}
                  onClick={() => navigate(`/cabinet/${groupId}/schedule`)}>
                  <SetOutline />
                </Button>
              )}
              {perms['planning.sendToTelegram'] && (
                <Button size="mini" fill="solid" disabled={!hasPlanForNextMeeting || !group.telegramGroupId || sendingPlan} loading={sendingPlan}
                  style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
                  onClick={async () => {
                    if (!nextMeetingDate) return
                    const confirmed = await Dialog.confirm({
                      title: 'Надіслати план у Telegram?',
                      content: 'План буде надіслано в Telegram-групу адмінів домашки.',
                      confirmText: 'Надіслати',
                      cancelText: 'Скасувати',
                    })
                    if (!confirmed) return
                    setSendingPlan(true)
                    try { await sendPlan(nextMeetingDate); Toast.show({ content: 'План надіслано в Telegram', icon: 'success' }) }
                    catch { Toast.show({ content: 'Помилка надсилання', icon: 'fail' }) }
                    finally { setSendingPlan(false) }
                  }}>Повідомити про план</Button>
              )}
            </div>
          </div>
        </div>

        {/* Block 3: Attendance */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <SectionLabel>Присутність</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {lastMeetingDate ? <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Остання: {formatDateUk(lastMeetingDate)}</span>
                  : <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Немає зустрічей</span>}
                {lastAttendance && (
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                    {lastAttendance.present}/{lastAttendance.total}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>{attendancePct}%</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="small" fill="outline" style={{ '--border-color': 'var(--color-border)', '--text-color': 'var(--color-text-secondary)' } as React.CSSProperties}
                  onClick={() => navigate(`/cabinet/${groupId}/attendance-table`)}>Таблиця</Button>
                {perms['attendance.record'] && (
                  <Button size="small" fill="solid" style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
                    onClick={() => navigate(`/cabinet/${groupId}/attendance${attendanceDate ? `?date=${attendanceDate}` : ''}`)}>Відмітити</Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block 4: Upcoming birthdays */}
        {upcomingEvents.length > 0 && (
          <div style={{ ...block, padding: '14px 16px' }}>
            <SectionLabel>Найближчі події</SectionLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map((ev) => (
                <div key={ev.personId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>🎂 {ev.fullName}</span>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{formatBirthday(ev.dateOfBirth)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', fontWeight: 600 }}>
                    {ev.daysUntil === 0 ? 'Сьогодні!' : `за ${ev.daysUntil} дн.`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block 5: Custom events */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Найближчі події групи</SectionLabel>
            {perms['groups.events.manage'] && (
              <button onClick={() => setAddEventVisible(true)} style={{ ...iconBtn, color: 'var(--color-primary)' }}><AddOutline style={{ fontSize: 18 }} /></button>
            )}
          </div>
          {events.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'block' }}>Немає запланованих подій</span>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 8px', marginBottom: 2, borderRadius: 8, background: ev.daysUntil <= 7 ? 'rgba(52, 199, 89, 0.08)' : 'transparent' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{formatEventDate(ev.month, ev.day)}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', marginRight: 10 }}>
                    {ev.daysUntil === 0 ? 'Сьогодні!' : ev.daysUntil === 1 ? 'Завтра' : `за ${ev.daysUntil} дн.`}
                  </span>
                  {perms['groups.events.manage'] && (
                    <button onClick={() => openEditEvent(ev)} style={{ ...iconBtn, color: 'var(--color-primary)', padding: 2, marginRight: 2 }}><EditSOutline style={{ fontSize: 16 }} /></button>
                  )}
                  {perms['groups.events.manage'] && (
                    <button onClick={() => deleteEvent(ev.id)} style={{ ...iconBtn, color: 'var(--color-error)', padding: 2 }}><DeleteOutline style={{ fontSize: 16 }} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 6: Needs */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel>Потреби</SectionLabel>
            {perms['groups.events.manage'] && (
              <button onClick={() => setAddNeedVisible(true)} style={{ ...iconBtn, color: 'var(--color-primary)' }}><AddOutline style={{ fontSize: 18 }} /></button>
            )}
          </div>
          {needs.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'block' }}>Немає потреб</span>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {needs.map((need) => (
                <div key={need.id} style={{ padding: '10px 10px', borderRadius: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {(need.personId || need.userId) ? (
                        <button
                          onClick={() => need.personId ? navigate(`/people/${need.personId}`) : navigate(`/admins/${need.userId}`)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%', textAlign: 'left' }}
                        >
                          {need.subjectName} →
                        </button>
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{need.subjectName}</div>
                      )}
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{need.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 4 }}>
                      {perms['groups.events.manage'] && (
                        <>
                          <button onClick={() => openEditNeed(need)} style={{ ...iconBtn, color: 'var(--color-primary)', padding: 2 }}><EditSOutline style={{ fontSize: 15 }} /></button>
                          <button onClick={() => handleDeleteNeed(need.id)} style={{ ...iconBtn, color: 'var(--color-error)', padding: 2 }}><DeleteOutline style={{ fontSize: 15 }} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setNeedStatusPickerId(need.id)}
                      style={{ ...needStatusStyle(need.status), cursor: 'pointer', border: 'none' }}
                    >
                      {NEED_STATUS_LABEL[need.status]}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Block 7: Org team */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <SectionLabel>Орг команда</SectionLabel>
          {orgTeam.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8, display: 'block' }}>Немає призначених адмінів</span>
            : orgTeam.map((member) => <OrgMemberRow key={member.id} member={member} />)
          }
        </div>

        {/* Stats */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionLabel>Статистика</SectionLabel>
              <Button size="mini" fill="none" style={{ '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                onClick={() => navigate(`/cabinet/${groupId}/stats`)}>Деталі →</Button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <StatCard label="Ср. відвід. (3м)" value={`${stats.avgAttendanceRate}%`} prev={`${stats.prevAvgAttendanceRate}%`} change={stats.avgAttendanceRate - stats.prevAvgAttendanceRate} />
              <StatCard label="Нових (3 міс)" value={`${stats.newMembers}`} prev={`${stats.prevNewMembers}`} change={stats.newMembers - stats.prevNewMembers} />
              <StatCard label="Всього учасників" value={`${stats.totalMembers}`} prev={`${stats.prevTotalMembers}`} change={stats.totalMembers - stats.prevTotalMembers} />
            </div>
          </div>
        </div>

        {/* Telegram notifications */}
        {notifSettings && (
          <div style={{ ...block, padding: '14px 16px' }}>
            <SectionLabel>Сповіщення Telegram</SectionLabel>
            {NOTIF_ITEMS.map(({ key, label, description }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{description}</div>
                </div>
                <Switch
                  checked={notifSettings[key as keyof typeof notifSettings]}
                  onChange={(val) => updateNotifSettings({ ...notifSettings, [key]: val })}
                />
              </div>
            ))}
          </div>
        )}

        {/* Block 8: Active members */}
        {(() => {
          const activeMembers = members.filter((m) => !m.isFormer)
          return (
            <div style={{ ...block, padding: '14px 16px' }}>
              <SectionLabel>Члени групи</SectionLabel>
              {activeMembers.length === 0
                ? <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8, display: 'block' }}>Немає членів</span>
                : <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {activeMembers.map((m) => (
                      <MemberRowMobile
                        key={`${m.isAdmin ? 'u' : 'p'}-${m.isAdmin ? m.userId : m.id}`}
                        member={m}
                        navigate={navigate}
                        onViewHistory={handleViewHistory}
                        onSetJoinDate={(member) => { setJoinDateMember(member); setJoinDateValue(member.joinedAt ? member.joinedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)) }}
                        onSetLeftDate={(member) => { setLeftDateMember(member); setLeftDateValue(member.leftAt ? member.leftAt.slice(0, 10) : new Date().toISOString().slice(0, 10)) }}
                        onTransfer={handleOpenTransfer}
                        onRemove={handleRemoveMember}
                      />
                    ))}
                  </div>
              }
            </div>
          )
        })()}

        {/* Block 9: Former members */}
        {members.some((m) => m.isFormer) && (() => {
          const formerMembers = members.filter((m) => m.isFormer)
          return (
            <div style={{ ...block, padding: '14px 16px' }}>
              <SectionLabel>Минулі члени ({formerMembers.length})</SectionLabel>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {formerMembers.map((m) => (
                  <MemberRowMobile
                    key={`${m.isAdmin ? 'u' : 'p'}-${m.isAdmin ? m.userId : m.id}`}
                    member={m}
                    navigate={navigate}
                    onViewHistory={handleViewHistory}
                    onSetJoinDate={(member) => { setJoinDateMember(member); setJoinDateValue(member.joinedAt ? member.joinedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)) }}
                    onSetLeftDate={(member) => { setLeftDateMember(member); setLeftDateValue(member.leftAt ? member.leftAt.slice(0, 10) : new Date().toISOString().slice(0, 10)) }}
                    onTransfer={handleOpenTransfer}
                    onRemove={handleRemoveMember}
                  />
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Edit event popup */}
      <Popup visible={editEventVisible} onMaskClick={() => setEditEventVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Редагувати подію</div>
        <FormField label="Назва" required><Input value={editEventName} onChange={setEditEventName} placeholder="Назва події" autoFocus /></FormField>
        <FormField label="Дата" required><input type="date" value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} style={{ ...nativeSelect, padding: 0 }} /></FormField>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block loading={savingEvent} onClick={handleUpdateEvent} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Зберегти</Button>
          <Button block fill="outline" onClick={() => setEditEventVisible(false)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Add event popup */}
      <Popup visible={addEventVisible} onMaskClick={() => setAddEventVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нова подія</div>
        <FormField label="Назва" required><Input value={newEventName} onChange={setNewEventName} placeholder="Назва події" autoFocus /></FormField>
        <FormField label="Дата" required><input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} style={{ ...nativeSelect, padding: 0 }} /></FormField>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block loading={addingEvent} onClick={handleAddEvent} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Додати</Button>
          <Button block fill="outline" onClick={() => setAddEventVisible(false)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Reschedule popup */}
      <Popup visible={rescheduleVisible} onMaskClick={() => setRescheduleVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Перенести домашку</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><FormField label="Нова дата" required><input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} style={{ ...nativeSelect, padding: 0 }} /></FormField></div>
          <div style={{ width: 110 }}><FormField label="Час початку"><input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} style={{ ...nativeSelect, padding: 0 }} /></FormField></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <Button block loading={rescheduling} onClick={handleReschedule} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Перенести</Button>
          <Button block fill="outline" onClick={() => setRescheduleVisible(false)}>Назад</Button>
        </div>
      </Popup>

      {/* Room picker popup */}
      <Popup visible={roomPickerVisible} onMaskClick={() => setRoomPickerVisible(false)}
        bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ padding: 24, paddingBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Бронювання кімнати</div>
          {nextMeetingDate && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{formatDateUk(nextMeetingDate)}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Автобронювання</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Бронювати цю кімнату автоматично щозустрічі</div>
            </div>
            <Switch checked={autoBook} onChange={setAutoBook} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Кімната</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <button onClick={() => setSelectedRoomId(null)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `2px solid ${selectedRoomId === null ? 'var(--color-primary)' : 'var(--color-border)'}`, background: selectedRoomId === null ? 'rgba(99,102,241,0.06)' : '#fff', cursor: 'pointer' }}>
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Без кімнати</span>
            </button>
            {rooms.map((room) => {
              const isBusy = busyRoomIds.has(room.id) && room.id !== nextMeetingRoomId
              return (
                <button key={room.id} onClick={() => setSelectedRoomId(room.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `2px solid ${selectedRoomId === room.id ? room.color : 'var(--color-border)'}`, background: selectedRoomId === room.id ? `${room.color}10` : '#fff', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: room.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{room.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{room.building} · пов. {room.floor}</span>
                    </div>
                    {isBusy && <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>зайнято</span>}
                  </div>
                </button>
              )
            })}
          </div>
          {(nextMeetingEvents?.length ?? 0) > 0 && (
            <>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Події цього дня</div>
              <MeetingTimeline events={nextMeetingEvents!} meetingStartTime={group.meetingTime} meetingEndTime={group.meetingEndTime} rooms={rooms} bookedRoomId={selectedRoomId} />
            </>
          )}
          {(() => {
            const selectedIsBusy = selectedRoomId !== null && busyRoomIds.has(selectedRoomId) && selectedRoomId !== nextMeetingRoomId
            const busyRoom = selectedIsBusy ? rooms.find((r) => r.id === selectedRoomId) : null
            return (
              <>
                {selectedIsBusy && <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 8, background: '#FEF3C7', border: '1px solid #FBBF24', fontSize: 12, color: '#92400E' }}>{busyRoom?.name} зайнято на цей час — оберіть іншу кімнату</div>}
                <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
                  <Button block loading={bookingLoading} disabled={selectedIsBusy} onClick={handleBookRoom} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Зберегти</Button>
                  <Button block fill="outline" onClick={() => setRoomPickerVisible(false)}>Назад</Button>
                </div>
              </>
            )
          })()}
        </div>
      </Popup>

      {/* Add need popup */}
      <Popup visible={addNeedVisible} onMaskClick={() => setAddNeedVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нова потреба</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>Імʼя людини<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, ...inputWrap }}><Input value={newNeedSubject} onChange={(v) => { setNewNeedSubject(v); setNewNeedPersonId(null); setNewNeedUserId(null) }} placeholder="Ім'я або введіть вручну" /></div>
            <Button size="small" fill="outline" onClick={() => openMemberPicker('add')} style={{ flexShrink: 0, '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}>З групи</Button>
          </div>
          {(newNeedPersonId || newNeedUserId) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✓ Прив'язано до профілю</span>
              <button onClick={() => { setNewNeedPersonId(null); setNewNeedUserId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)', padding: 0 }}>× скасувати</button>
            </div>
          )}
        </div>
        <FormField label="Потреба" required><Input value={newNeedDesc} onChange={setNewNeedDesc} placeholder="Опис потреби" /></FormField>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button block loading={addingNeed} onClick={handleAddNeed} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Додати</Button>
          <Button block fill="outline" onClick={() => setAddNeedVisible(false)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Edit need popup */}
      <Popup visible={editNeedVisible} onMaskClick={() => setEditNeedVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Редагувати потребу</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>Імʼя людини<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, ...inputWrap }}><Input value={editNeedSubject} onChange={(v) => { setEditNeedSubject(v); setEditNeedPersonId(null); setEditNeedUserId(null) }} placeholder="Ім'я" /></div>
            <Button size="small" fill="outline" onClick={() => openMemberPicker('edit')} style={{ flexShrink: 0, '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}>З групи</Button>
          </div>
          {(editNeedPersonId || editNeedUserId) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✓ Прив'язано до профілю</span>
              <button onClick={() => { setEditNeedPersonId(null); setEditNeedUserId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)', padding: 0 }}>× скасувати</button>
            </div>
          )}
        </div>
        <FormField label="Потреба" required><Input value={editNeedDesc} onChange={setEditNeedDesc} placeholder="Опис потреби" /></FormField>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button block loading={savingNeed} onClick={handleUpdateNeed} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Зберегти</Button>
          <Button block fill="outline" onClick={() => setEditNeedVisible(false)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Member picker popup */}
      <Popup visible={memberPickerVisible} onMaskClick={() => setMemberPickerVisible(false)} bodyStyle={{ padding: '20px 0 0', borderRadius: '16px 16px 0 0', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Вибрати з групи</span>
          <button onClick={() => setMemberPickerVisible(false)} style={{ ...iconBtn, fontSize: 18, color: 'var(--color-text-tertiary)' }}>×</button>
        </div>
        <div style={{ padding: '0 16px 10px' }}>
          <div style={inputWrap}><Input value={memberSearch} onChange={setMemberSearch} placeholder="Пошук..." clearable /></div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
          {membersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><SpinLoading color="primary" /></div>
          ) : (
            groupMembers
              .filter((m) => {
                const q = memberSearch.toLowerCase()
                return !q || [m.name, m.lastName].filter(Boolean).join(' ').toLowerCase().includes(q)
              })
              .map((member) => {
                const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
                return (
                  <button key={member.isAdmin ? `u${member.userId}` : `p${member.id}`}
                    onClick={() => handleMemberSelect(member)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {fullName[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{fullName}</div>
                      {member.isAdmin && <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>Адмін</div>}
                    </div>
                  </button>
                )
              })
          )}
        </div>
      </Popup>

      {/* Need status action sheet */}
      <ActionSheet
        visible={needStatusPickerId !== null}
        onClose={() => setNeedStatusPickerId(null)}
        cancelText="Скасувати"
        actions={[
          { text: 'Активна', key: 'active', description: 'Потреба актуальна' },
          { text: 'Отримана відповідь', key: 'answered', description: 'Молитва або потреба виконана', bold: true },
          { text: 'Не актуальна', key: 'irrelevant', description: 'Більше не потрібно' },
        ]}
        onAction={(action) => {
          const need = needs.find((n) => n.id === needStatusPickerId)
          if (need) handleNeedStatusChange(need, action.key as string)
          setNeedStatusPickerId(null)
        }}
      />

      {/* Set join date popup */}
      <Popup visible={!!joinDateMember} onMaskClick={() => setJoinDateMember(null)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Налаштувати дату початку</div>
        {joinDateMember && (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            {[joinDateMember.name, joinDateMember.lastName].filter(Boolean).join(' ')}
          </div>
        )}
        <FormField label="Дата приєднання">
          <input type="date" value={joinDateValue} onChange={(e) => setJoinDateValue(e.target.value)} style={{ ...nativeSelect, padding: 0 }} />
        </FormField>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <Button block loading={savingJoinDate}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
            onClick={async () => {
              if (!joinDateMember || !joinDateValue) return
              setSavingJoinDate(true)
              try {
                await setMemberJoinedAt(
                  joinDateMember.isAdmin ? null : joinDateMember.id,
                  joinDateMember.isAdmin ? (joinDateMember.userId ?? null) : null,
                  joinDateValue,
                )
                setJoinDateMember(null)
                Toast.show({ content: 'Дату збережено', icon: 'success' })
              } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
              setSavingJoinDate(false)
            }}>Зберегти</Button>
          <Button block fill="outline" onClick={() => setJoinDateMember(null)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Set left date popup */}
      <Popup visible={!!leftDateMember} onMaskClick={() => setLeftDateMember(null)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Налаштувати дату виходу</div>
        {leftDateMember && (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            {[leftDateMember.name, leftDateMember.lastName].filter(Boolean).join(' ')}
          </div>
        )}
        <FormField label="Дата виходу">
          <input type="date" value={leftDateValue} onChange={(e) => setLeftDateValue(e.target.value)} style={{ ...nativeSelect, padding: 0 }} />
        </FormField>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <Button block loading={savingLeftDate}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
            onClick={async () => {
              if (!leftDateMember || !leftDateValue) return
              setSavingLeftDate(true)
              try {
                await setMemberLeftAt(
                  leftDateMember.isAdmin ? null : leftDateMember.id,
                  leftDateMember.isAdmin ? (leftDateMember.userId ?? null) : null,
                  leftDateValue,
                )
                setLeftDateMember(null)
                Toast.show({ content: 'Дату збережено', icon: 'success' })
              } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
              setSavingLeftDate(false)
            }}>Зберегти</Button>
          <Button block fill="outline" onClick={() => setLeftDateMember(null)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Transfer member popup */}
      <Popup visible={!!transferTarget} onMaskClick={() => setTransferTarget(null)} bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 12px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Перевести на іншу домашку</div>
          {transferTarget && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {[transferTarget.name, transferTarget.lastName].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {allGroups.map((g) => (
            <button key={g.id} onClick={() => setTransferToGroupId(g.id)}
              style={{ width: '100%', textAlign: 'left', padding: '12px 20px', background: transferToGroupId === g.id ? `${g.color}12` : 'none', border: 'none', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: transferToGroupId === g.id ? 600 : 400, color: 'var(--color-text)' }}>{g.name}</span>
              {transferToGroupId === g.id && <span style={{ marginLeft: 'auto', color: g.color, fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>
        <div style={{ padding: '12px 20px', display: 'flex', gap: 8 }}>
          <Button block loading={transferring} disabled={!transferToGroupId} onClick={handleConfirmTransfer}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Перевести</Button>
          <Button block fill="outline" onClick={() => setTransferTarget(null)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Member history popup */}
      <Popup visible={!!historyMember} onMaskClick={() => setHistoryMember(null)} bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Історія</div>
            {historyMember && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{[historyMember.name, historyMember.lastName].filter(Boolean).join(' ')}</div>}
          </div>
          <button onClick={() => setHistoryMember(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 4, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 20px 24px' }}>
          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><SpinLoading color="primary" /></div>
          ) : historyEvents.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 24 }}>Немає записів</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, background: 'var(--color-border-light)' }} />
              {historyEvents.map((ev, idx) => <MobileTimelineItem key={idx} event={ev} />)}
            </div>
          )}
        </div>
      </Popup>

      {/* Edit group popup */}
      <EditGroupPopupMobile group={group} visible={editVisible} onClose={() => setEditVisible(false)} onSaved={() => { setEditVisible(false); reload() }} />
    </div>
  )
}

// ── Meeting day timeline ──────────────────────────────────────────────────────

function MeetingTimeline({ events, meetingStartTime, meetingEndTime, rooms, bookedRoomId }: {
  events: CabinetCalendarEvent[]
  meetingStartTime?: string
  meetingEndTime?: string
  rooms: Room[]
  bookedRoomId: number | null
}) {
  const sorted = [...events].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      {meetingStartTime && (
        <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6366F1' }}>Домашка</span>
            {bookedRoomId && roomMap.get(bookedRoomId) && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>{roomMap.get(bookedRoomId)!.name}</span>}
          </div>
          <span style={{ fontSize: 12, color: '#6366F1' }}>{meetingStartTime}{meetingEndTime ? ` — ${meetingEndTime}` : ''}</span>
        </div>
      )}
      {sorted.map((ev) => {
        const room = ev.roomId ? roomMap.get(ev.roomId) : null
        const isConflict = ev.roomId === bookedRoomId && bookedRoomId !== null
        return (
          <div key={ev.eventId} style={{ padding: '7px 10px', borderRadius: 8, background: isConflict ? '#FEF3C7' : 'var(--color-bg)', border: `1px solid ${isConflict ? '#FBBF24' : 'var(--color-border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: ev.homeGroupColor ?? ev.roomId ? (room?.color ?? '#9CA3AF') : '#9CA3AF' }} />
              <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{ev.title}</span>
              {room && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{room.name}</span>}
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0, marginLeft: 8 }}>{[ev.startTime, ev.endTime].filter(Boolean).join(' — ')}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRowMobile({ member, navigate, onViewHistory, onSetJoinDate, onSetLeftDate, onTransfer, onRemove }: {
  member: GroupMember
  navigate: ReturnType<typeof useNavigate>
  onViewHistory: (member: GroupMember) => void
  onSetJoinDate: (member: GroupMember) => void
  onSetLeftDate: (member: GroupMember) => void
  onTransfer: (member: GroupMember) => void
  onRemove: (member: GroupMember) => void
}) {
  const [actionVisible, setActionVisible] = useState(false)
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
  const joinedDate = member.joinedAt
    ? new Date(member.joinedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    : null
  const leftDate = member.leftAt
    ? new Date(member.leftAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    : null

  const actions = member.isFormer
    ? [
        { text: 'Переглянути', key: 'view' },
        { text: 'Налаштувати дату початку', key: 'join-date' },
        { text: 'Налаштувати дату виходу', key: 'left-date' },
        { text: 'Історія', key: 'history' },
      ]
    : [
        { text: 'Переглянути', key: 'view' },
        { text: 'Налаштувати дату початку', key: 'join-date' },
        { text: 'Перевести на іншу домашку', key: 'transfer' },
        ...(!member.isAdmin ? [{ text: 'Вилучити з домашки', key: 'remove', danger: true as const }] : []),
      ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', opacity: member.isFormer ? 0.6 : 1 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}
          onClick={() => navigate(member.isAdmin ? `/admins/${member.userId}` : `/people/${member.id}`)}>
          <span style={{ fontSize: 15, fontWeight: 600, color: member.isFormer ? 'var(--color-text-secondary)' : 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</span>
          {member.isFormer && (
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', flexShrink: 0 }}>колишній</span>
          )}
          {!member.isFormer && member.isAdmin && member.roleTag && (
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: `${member.roleTag.color}20`, color: member.roleTag.color, flexShrink: 0 }}>{member.roleTag.name}</span>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>
          {member.isFormer && leftDate
            ? <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>до {leftDate}</span>
            : joinedDate
              ? <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>з {joinedDate}</span>
              : <span style={{ width: 40, display: 'inline-block' }} />
          }
        </div>
        <button onClick={() => setActionVisible(true)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--color-text-tertiary)', padding: '4px 4px', cursor: 'pointer', flexShrink: 0 }}>•••</button>
      </div>
      <ActionSheet
        visible={actionVisible}
        onClose={() => setActionVisible(false)}
        cancelText="Скасувати"
        actions={actions}
        onAction={(action) => {
          setActionVisible(false)
          if (action.key === 'view') navigate(member.isAdmin ? `/admins/${member.userId}` : `/people/${member.id}`)
          if (action.key === 'join-date') onSetJoinDate(member)
          if (action.key === 'left-date') onSetLeftDate(member)
          if (action.key === 'transfer') onTransfer(member)
          if (action.key === 'remove') onRemove(member)
          if (action.key === 'history') onViewHistory(member)
        }}
      />
    </>
  )
}

// ── Mobile timeline item ──────────────────────────────────────────────────────

const TIMELINE_DOT_COLORS: Record<string, string> = {
  group_joined:     '#16A34A',
  group_left:       '#DC2626',
  status_change:    '#2563EB',
  oversight_change: '#7C3AED',
}

function MobileTimelineItem({ event }: { event: TimelineEvent }) {
  const color = TIMELINE_DOT_COLORS[event.type] ?? '#9CA3AF'
  const date = new Date(event.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })

  let label = ''
  if (event.type === 'group_joined') {
    label = event.groupName ? `Приєднався до «${event.groupName}»` : 'Приєднався до групи'
  } else if (event.type === 'group_left') {
    label = event.groupName ? `Вийшов з «${event.groupName}»` : 'Вийшов з групи'
  } else if (event.type === 'status_change') {
    if (event.oldStatusName && event.statusName) label = `Статус: ${event.oldStatusName} → ${event.statusName}`
    else if (event.statusName) label = `Статус: ${event.statusName}`
    else label = 'Статус змінено'
  } else if (event.type === 'oversight_change') {
    label = event.oversightName ? `Опікун: ${event.oversightName}` : 'Опікун знятий'
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 24, marginBottom: 20 }}>
      <div style={{ position: 'absolute', left: 2, top: 4, width: 12, height: 12, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: `0 0 0 2px ${color}50` }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{date}</div>
    </div>
  )
}

// ── Org member row ────────────────────────────────────────────────────────────

function OrgMemberRow({ member }: { member: GroupCabinet['orgTeam'][0] }) {
  const navigate = useNavigate()
  const canViewPeople = usePermission('people.view')
  const canViewAdmins = usePermission('admins.viewProfiles')
  const [open, setOpen] = useState(false)
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <span
            onClick={() => { if (canViewAdmins) navigate(`/admins/${member.id}`) }}
            style={{ fontSize: 14, fontWeight: 600, color: canViewAdmins ? 'var(--color-primary)' : 'var(--color-text)', cursor: canViewAdmins ? 'pointer' : 'default' }}
          >{fullName}</span>
          {member.role && <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '1px 6px', color: member.role.color, background: `${member.role.color}20` }}>{member.role.name}</span>}
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{member.overseeCount} під опікою</span>
        </div>
        <button onClick={() => setOpen((v) => !v)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 14, flexShrink: 0 }}>
          {open ? <UpOutline /> : <DownOutline />}
        </button>
      </div>
      {open && member.oversees.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: '2px solid var(--color-border-light)' }}>
          {member.oversees.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{p.fullName}</span>
              {canViewPeople && <button onClick={(e) => { e.stopPropagation(); navigate(`/people/${p.id}`) }} style={{ ...iconBtn, padding: 4, color: 'var(--color-primary)' }}><RightOutline style={{ fontSize: 13 }} /></button>}
            </div>
          ))}
        </div>
      )}
      {open && member.oversees.length === 0 && <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', paddingLeft: 12, marginTop: 4 }}>Немає людей під опікою</div>}
    </div>
  )
}

// ── Edit group popup ──────────────────────────────────────────────────────────

const MEETING_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

function EditGroupPopupMobile({ group, visible, onClose, onSaved }: {
  group: GroupCabinet['group']; visible: boolean; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState(group.name)
  const [meetingDay, setMeetingDay] = useState(group.meetingDay ?? '')
  const [meetingTime, setMeetingTime] = useState(group.meetingTime ?? '')
  const [meetingEndTime, setMeetingEndTime] = useState(group.meetingEndTime ?? '')
  const [location, setLocation] = useState(group.location ?? '')
  const [telegramGroupId, setTelegramGroupId] = useState(group.telegramGroupId ?? '')
  const [saving, setSaving] = useState(false)
  const { saveGroupInfo } = useCabinetData(group.id)

  useEffect(() => {
    if (visible) { setName(group.name); setMeetingDay(group.meetingDay ?? ''); setMeetingTime(group.meetingTime ?? ''); setMeetingEndTime(group.meetingEndTime ?? ''); setLocation(group.location ?? ''); setTelegramGroupId(group.telegramGroupId ?? '') }
  }, [visible, group])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await saveGroupInfo({ name: name.trim(), meetingDay: meetingDay || undefined, meetingTime: meetingTime || undefined, meetingEndTime: meetingEndTime || undefined, location: location.trim() || undefined, telegramGroupId: telegramGroupId.trim() || undefined })
      onSaved()
    } catch { Toast.show({ content: 'Помилка збереження', icon: 'fail' }) }
    setSaving(false)
  }

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Редагувати групу</div>
      <FormField label="Назва групи" required><Input value={name} onChange={setName} placeholder="Назва" /></FormField>
      <FormField label="День домашки">
        <select value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} style={nativeSelect}>
          <option value="">— не вибрано —</option>
          {MEETING_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </FormField>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}><FormField label="Початок"><input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} style={{ ...nativeSelect, padding: 0 }} /></FormField></div>
        <div style={{ flex: 1 }}><FormField label="Кінець"><input type="time" value={meetingEndTime} onChange={(e) => setMeetingEndTime(e.target.value)} style={{ ...nativeSelect, padding: 0 }} /></FormField></div>
      </div>
      <FormField label="Адреса"><Input value={location} onChange={setLocation} placeholder="Адреса зустрічі" /></FormField>
      <FormField label="ID групи в Telegram"><Input value={telegramGroupId} onChange={setTelegramGroupId} placeholder="-1001234567890" /></FormField>
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button block loading={saving} onClick={handleSave} style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>Зберегти</Button>
        <Button block fill="outline" onClick={onClose}>Скасувати</Button>
      </div>
    </Popup>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{children}</div>
}

function StatCard({ label, value, prev, change }: { label: string; value: string; prev?: string; change?: number }) {
  return (
    <div style={{ flex: 1, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      {prev != null && (
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
          {prev}{change != null && change !== 0 && (
            <span style={{ color: change > 0 ? '#22C55E' : '#EF4444', marginLeft: 2 }}>
              {change > 0 ? '↑' : '↓'}
            </span>
          )}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
      </div>
      <div style={inputWrap}>{children}</div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = { background: '#fff', borderRadius: 'var(--radius-lg)', padding: '0 16px', marginTop: 16, boxShadow: 'var(--shadow-sm)' }
const inputWrap: React.CSSProperties = { background: '#F9FAFB', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '8px 12px' }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }
const nativeSelect: React.CSSProperties = { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--color-text)' }
const tagStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 7px' }

const NEED_STATUS_LABEL: Record<string, string> = {
  active: 'Активна',
  answered: 'Отримана відповідь',
  irrelevant: 'Не актуальна',
}

const NEED_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  active:     { color: '#2563EB', bg: '#EFF6FF' },
  answered:   { color: '#16A34A', bg: '#F0FDF4' },
  irrelevant: { color: '#6B7280', bg: '#F3F4F6' },
}

function needStatusStyle(status: string): React.CSSProperties {
  const { color, bg } = NEED_STATUS_COLORS[status] ?? NEED_STATUS_COLORS.active
  return { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '3px 8px', color, background: bg }
}
