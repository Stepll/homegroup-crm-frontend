import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Drawer, Dropdown, Spin, Empty, Modal, Form, Input, Select, TimePicker, Tag, Row, Col, Statistic, Typography, Flex, Alert, Divider, Switch, Timeline } from 'antd'
import { EditOutlined, PlusOutlined, DeleteOutlined, RightOutlined, DownOutlined, UpOutlined, SettingOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { groupsApi } from '@/api/groups'
import { useAuth } from '@/store/auth'
import { usePermission, usePermissions } from '@/hooks/usePermission'
import { useCabinetData, computePrevMeetingDate, formatDateUk, formatBirthday, formatEventDate } from './useCabinetData'
import type { Group, GroupCabinet, GroupEvent, GroupMember, GroupNeed, TimelineEvent } from '@/types'

const ADMIN_ROLES = ['SuperAdmin', 'Admin']
const MEETING_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

const NOTIF_ITEMS = [
  { key: 'eventSevenDays', label: 'Подія за 7 днів',        description: 'Нагадування у Telegram-групу за тиждень до події' },
  { key: 'eventDay',       label: 'В день події',            description: 'Нагадування вранці в день події' },
  { key: 'conflict',       label: 'Накладка у розкладі',     description: 'Сповіщення, якщо час домашки збігається з іншою подією' },
  { key: 'conflictResolved', label: 'Накладку усунено',      description: 'Сповіщення, коли конфлікт розкладу вирішено' },
  { key: 'attendanceAsk', label: 'Відмітка присутніх',       description: 'Запит через годину після початку домашки' },
]

const { Text } = Typography

// ── Group selector ────────────────────────────────────────────────────────────

function GroupSelectorDesktop() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '28px 32px' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700 }}>Домашка</h1>
      {loading ? (
        <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>
      ) : (
        <Row gutter={[16, 16]}>
          {groups.map((g) => (
            <Col key={g.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => navigate(`/cabinet/${g.id}`)}
                style={{ borderRadius: 12 }}
              >
                <Flex align="center" gap={10}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{g.name}</span>
                  <Tag color={g.isActive ? 'green' : 'default'}>{g.isActive ? 'Активна' : 'Неактивна'}</Tag>
                  <RightOutlined style={{ color: 'var(--color-text-tertiary)' }} />
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

// ── Top-level page ────────────────────────────────────────────────────────────

export function GroupCabinetPageDesktop() {
  const { id } = useParams<{ id?: string }>()
  const { user } = useAuth()
  const isAdmin = user?.roles?.some((r) => ADMIN_ROLES.includes(r)) ?? false
  const groupId = id ? Number(id) : (!isAdmin ? user?.primaryGroupId : undefined)

  if (!groupId && isAdmin) return <GroupSelectorDesktop />
  if (!groupId) return (
    <div style={{ padding: '28px 32px' }}>
      <Empty description="Вас не призначено до жодної групи" style={{ marginTop: 60 }} />
    </div>
  )
  return <CabinetViewDesktop groupId={groupId} isAdmin={isAdmin} />
}

// ── Cabinet content ───────────────────────────────────────────────────────────

function CabinetViewDesktop({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const navigate = useNavigate()
  const perms = usePermissions([
    'groups.edit', 'groups.nextMeeting.manage', 'groups.schedule.manage', 'groups.events.manage',
    'attendance.record', 'planning.view', 'planning.sendToTelegram',
  ])
  const {
    cabinet, rooms, events, needs, members, loading, reload,
    busyRoomIds, addEvent, updateEvent, deleteEvent,
    reschedule, bookRoom, sendPlan, saveGroupInfo, deletePlan,
    notifSettings, updateNotifSettings,
    addNeed, updateNeed, deleteNeed,
    setMemberJoinedAt, setMemberLeftAt, transferMember, removeMemberFromGroup,
  } = useCabinetData(groupId)

  const [editGroupVisible, setEditGroupVisible] = useState(false)
  const [addEventVisible, setAddEventVisible] = useState(false)
  const [editingEvent, setEditingEvent] = useState<GroupEvent | null>(null)
  const [rescheduleVisible, setRescheduleVisible] = useState(false)
  const [roomDrawerVisible, setRoomDrawerVisible] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [autoBook, setAutoBook] = useState(false)
  const [sendingPlan, setSendingPlan] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  const [addEventForm] = Form.useForm()
  const [editEventForm] = Form.useForm()
  const [rescheduleForm] = Form.useForm()
  const [addNeedVisible, setAddNeedVisible] = useState(false)
  const [editingNeed, setEditingNeed] = useState<GroupNeed | null>(null)
  const [addNeedPersonId, setAddNeedPersonId] = useState<number | null>(null)
  const [addNeedUserId, setAddNeedUserId] = useState<number | null>(null)
  const [groupMembersForNeeds, setGroupMembersForNeeds] = useState<import('@/types').GroupMember[]>([])
  const [addNeedForm] = Form.useForm()
  const [editNeedForm] = Form.useForm()

  const loadMembersForNeeds = async () => {
    if (groupMembersForNeeds.length > 0) return
    try { setGroupMembersForNeeds(await groupsApi.getMembers(groupId)) } catch { /* ignore */ }
  }
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
      const groups = await groupsApi.getAll()
      setAllGroups(groups.filter((g) => g.id !== groupId))
    } else {
      setAllGroups((prev) => prev.filter((g) => g.id !== groupId))
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
    } finally {
      setTransferring(false)
    }
  }

  const handleRemoveMember = (member: GroupMember) => {
    const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
    Modal.confirm({
      title: `Вилучити ${fullName} з домашки?`,
      content: 'Людина більше не буде прив\'язана до жодної домашки.',
      okText: 'Вилучити', okType: 'danger', cancelText: 'Скасувати',
      onOk: () => removeMemberFromGroup(member.id),
    })
  }

  const [editGroupForm] = Form.useForm()

  if (loading || !cabinet) return (
    <div style={{ padding: '28px 32px' }}>
      <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>
    </div>
  )

  const { group, nextMeetingDate, lastMeetingDate, lastAttendance, upcomingEvents, orgTeam, stats,
    hasPlanForNextMeeting, nextMeetingRoomId, nextMeetingConflicts } = cabinet

  const attendancePct = lastAttendance ? Math.round(lastAttendance.present * 100 / (lastAttendance.total || 1)) : null
  const attendanceDate = cabinet?.prevScheduledMeetingDate ?? lastMeetingDate ?? computePrevMeetingDate(group.meetingDay)
  const bookedRoom = rooms.find((r) => r.id === nextMeetingRoomId)
  const hasConflicts = (nextMeetingConflicts?.length ?? 0) > 0

  const handleSkipMeeting = () => {
    Modal.confirm({
      title: 'Скасувати наступну домашку?',
      content: 'Наступна зустріч зміститься на наступний день тижня.',
      okText: 'Скасувати зустріч',
      cancelText: 'Назад',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (hasPlanForNextMeeting && nextMeetingDate) {
          await new Promise<void>((resolve) => {
            Modal.confirm({
              title: 'Видалити план зустрічі?',
              content: 'У цієї зустрічі є збережений план. Видалити його?',
              okText: 'Видалити план',
              cancelText: 'Залишити',
              onOk: async () => { await deletePlan(nextMeetingDate); resolve() },
              onCancel: () => resolve(),
            })
          })
        }
        await import('@/api/groups').then(({ groupsApi: api }) => api.skipMeeting(groupId))
        reload()
      },
    })
  }

  const handleBookRoom = async () => {
    if (!nextMeetingDate) return
    setBookingLoading(true)
    try {
      await bookRoom(nextMeetingDate, selectedRoomId, autoBook)
      setRoomDrawerVisible(false)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <Flex align="center" gap={12} style={{ marginBottom: 20 }}>
        {isAdmin && (
          <Button type="text" onClick={() => navigate('/cabinet')} style={{ padding: '4px 8px' }}>
            ← Назад
          </Button>
        )}
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, flex: 1 }}>{group.name}</h1>
        {perms['groups.edit'] && (
          <Button icon={<EditOutlined />} onClick={() => {
            editGroupForm.setFieldsValue({
              name: group.name, meetingDay: group.meetingDay ?? '',
              meetingTime: group.meetingTime ? dayjs(group.meetingTime, 'HH:mm') : null,
              meetingEndTime: group.meetingEndTime ? dayjs(group.meetingEndTime, 'HH:mm') : null,
              location: group.location ?? '', telegramGroupId: group.telegramGroupId ?? '',
            })
            setEditGroupVisible(true)
          }}>Редагувати</Button>
        )}
      </Flex>

      {/* Conflict alert */}
      {hasConflicts && (
        <Alert
          type="warning"
          showIcon
          message={bookedRoom ? `Конфлікт бронювання — ${bookedRoom.name}` : 'Накладення по часу'}
          description={`${nextMeetingConflicts!.map((e) => e.title).join(', ')} накладається на час зустрічі`}
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Two-column layout */}
      <Row gutter={[20, 20]} align="top">
        {/* Left column */}
        <Col xs={24} lg={10}>
          {/* Next meeting */}
          <Card title="Наступна домашка" style={cardStyle}
            extra={perms['planning.view'] && (
              <Button size="small" type="link" onClick={() => navigate(`/cabinet/${groupId}/plan${nextMeetingDate ? `?date=${nextMeetingDate}` : ''}`)}>
                Планування →
              </Button>
            )}>
            <Text strong style={{ fontSize: 16 }}>{formatDateUk(nextMeetingDate) ?? 'Невідомо'}</Text>

            <Flex align="center" gap={8} style={{ marginTop: 10, marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Кімната:</Text>
              {bookedRoom
                ? <Tag style={{ background: `${bookedRoom.color}18`, color: bookedRoom.color, border: 'none' }}>{bookedRoom.name}</Tag>
                : <Text type="secondary" style={{ fontSize: 13 }}>не заброньовано</Text>}
              {cabinet.autoBookEnabled && <Tag color="purple" style={{ fontSize: 11 }}>авто</Tag>}
              <Button size="small" onClick={() => { setSelectedRoomId(nextMeetingRoomId ?? null); setAutoBook(cabinet.autoBookEnabled); setRoomDrawerVisible(true) }}
                disabled={!nextMeetingDate}>Бронювати</Button>
            </Flex>

            <Flex gap={8} wrap="wrap">
              {perms['groups.nextMeeting.manage'] && (
                <Button size="small" onClick={() => { rescheduleForm.setFieldsValue({ date: nextMeetingDate ?? '', time: group.meetingTime ? dayjs(group.meetingTime, 'HH:mm') : null }); setRescheduleVisible(true) }}>Перенести</Button>
              )}
              {perms['groups.nextMeeting.manage'] && (
                <Button size="small" danger disabled={!nextMeetingDate} onClick={handleSkipMeeting}>Скасувати</Button>
              )}
              {perms['groups.schedule.manage'] && (
                <Button size="small" icon={<SettingOutlined />} onClick={() => navigate(`/cabinet/${groupId}/schedule`)} title="Налаштування графіку" />
              )}
              {perms['planning.sendToTelegram'] && (
                <Button size="small" type="primary" loading={sendingPlan}
                  disabled={!hasPlanForNextMeeting || !group.telegramGroupId}
                  onClick={() => {
                    if (!nextMeetingDate) return
                    Modal.confirm({
                      title: 'Надіслати план у Telegram?',
                      content: 'План буде надіслано в Telegram-групу адмінів домашки.',
                      okText: 'Надіслати',
                      cancelText: 'Скасувати',
                      onOk: async () => {
                        setSendingPlan(true)
                        try { await sendPlan(nextMeetingDate) } finally { setSendingPlan(false) }
                      },
                    })
                  }}>Повідомити про план</Button>
              )}
            </Flex>
          </Card>

          {/* Attendance */}
          <Card title="Присутність" style={{ ...cardStyle, marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {lastMeetingDate ? `Остання: ${formatDateUk(lastMeetingDate)}` : 'Немає зустрічей'}
            </Text>
            {lastAttendance && (
              <Flex align="baseline" gap={8} style={{ marginTop: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 700 }}>{lastAttendance.present}/{lastAttendance.total}</span>
                <Text type="secondary">{attendancePct}%</Text>
              </Flex>
            )}
            <Flex gap={8}>
              <Button onClick={() => navigate(`/cabinet/${groupId}/attendance-table`)}>Таблиця</Button>
              {perms['attendance.record'] && (
                <Button type="primary" onClick={() => navigate(`/cabinet/${groupId}/attendance${attendanceDate ? `?date=${attendanceDate}` : ''}`)}>
                  Відмітити
                </Button>
              )}
            </Flex>
          </Card>

          {/* Stats */}
          <Card title="Статистика" style={{ ...cardStyle, marginTop: 16 }}
            extra={<Button size="small" type="link" onClick={() => navigate(`/cabinet/${groupId}/stats`)}>Деталі →</Button>}>
            <Row gutter={16}>
              <Col span={8}><Statistic title="Ср. відвідуваність" value={`${stats.avgAttendanceRate}%`} valueStyle={{ fontSize: 20 }} /></Col>
              <Col span={8}><Statistic title="Нових цього місяця" value={stats.newMembersThisMonth} valueStyle={{ fontSize: 20 }} /></Col>
              <Col span={8}><Statistic title="Всього учасників" value={stats.totalMembers} valueStyle={{ fontSize: 20 }} /></Col>
            </Row>
          </Card>

          {/* Telegram notifications */}
          {notifSettings && (
            <Card title="Сповіщення Telegram" style={{ ...cardStyle, marginTop: 16 }}>
              {NOTIF_ITEMS.map(({ key, label, description }) => (
                <Flex key={key} justify="space-between" align="center" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div>
                    <Text style={{ fontSize: 14 }}>{label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
                  </div>
                  <Switch
                    checked={notifSettings[key as keyof typeof notifSettings]}
                    onChange={(val) => updateNotifSettings({ ...notifSettings, [key]: val })}
                  />
                </Flex>
              ))}
            </Card>
          )}

          {/* Active members */}
          {(() => {
            const activeMembers = members.filter((m) => !m.isFormer)
            return (
              <Card title="Члени групи" style={{ ...cardStyle, marginTop: 16 }}>
                {activeMembers.length === 0
                  ? <Text type="secondary">Немає членів</Text>
                  : <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {activeMembers.map((m) => (
                        <MemberRowDesktop
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
              </Card>
            )
          })()}

          {/* Former members */}
          {members.some((m) => m.isFormer) && (() => {
            const formerMembers = members.filter((m) => m.isFormer)
            return (
              <Card title={`Минулі члени (${formerMembers.length})`} style={{ ...cardStyle, marginTop: 16 }}>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {formerMembers.map((m) => (
                    <MemberRowDesktop
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
              </Card>
            )
          })()}
        </Col>

        {/* Right column */}
        <Col xs={24} lg={14}>
          {/* Birthdays */}
          {upcomingEvents.length > 0 && (
            <Card title="Дні народження" style={{ ...cardStyle, marginBottom: 16 }}>
              {upcomingEvents.map((ev) => (
                <Flex key={ev.personId} justify="space-between" align="center" style={{ padding: '6px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div>
                    <Text strong>🎂 {ev.fullName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>{formatBirthday(ev.dateOfBirth)}</Text>
                  </div>
                  <Text type={ev.daysUntil === 0 ? 'danger' : 'secondary'} strong={ev.daysUntil === 0}>
                    {ev.daysUntil === 0 ? 'Сьогодні!' : `за ${ev.daysUntil} дн.`}
                  </Text>
                </Flex>
              ))}
            </Card>
          )}

          {/* Custom events */}
          <Card
            title="Найближчі події групи"
            style={cardStyle}
            extra={perms['groups.events.manage'] && (
              <Button size="small" icon={<PlusOutlined />} type="primary" ghost
                onClick={() => { addEventForm.resetFields(); addEventForm.setFieldValue('date', new Date().toISOString().split('T')[0]); setAddEventVisible(true) }}>
                Додати
              </Button>
            )}
          >
            {events.length === 0 ? (
              <Text type="secondary">Немає запланованих подій</Text>
            ) : <div style={{ maxHeight: 320, overflowY: 'auto' }}>{events.map((ev) => (
              <Flex key={ev.id} align="center" justify="space-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ flex: 1, background: ev.daysUntil <= 7 ? 'rgba(52,199,89,0.06)' : 'transparent', borderRadius: 6, padding: '2px 6px' }}>
                  <Text strong>{ev.name}</Text>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>{formatEventDate(ev.month, ev.day)}</Text>
                </div>
                <Flex align="center" gap={8}>
                  <Text type={ev.daysUntil === 0 ? 'danger' : 'secondary'} strong={ev.daysUntil === 0} style={{ fontSize: 13 }}>
                    {ev.daysUntil === 0 ? 'Сьогодні!' : ev.daysUntil === 1 ? 'Завтра' : `за ${ev.daysUntil} дн.`}
                  </Text>
                  {perms['groups.events.manage'] && (
                    <>
                      <Button size="small" type="text" icon={<EditOutlined />}
                        onClick={() => {
                          setEditingEvent(ev)
                          const y = ev.year ?? new Date().getFullYear()
                          editEventForm.setFieldsValue({ name: ev.name, date: `${y}-${String(ev.month).padStart(2, '0')}-${String(ev.day).padStart(2, '0')}` })
                        }} />
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteEvent(ev.id)} />
                    </>
                  )}
                </Flex>
              </Flex>
            ))}</div>}
          </Card>

          {/* Needs */}
          <Card
            title="Потреби"
            style={{ ...cardStyle, marginTop: 16 }}
            extra={perms['groups.events.manage'] && (
              <Button size="small" icon={<PlusOutlined />} type="primary" ghost
                onClick={() => { addNeedForm.resetFields(); setAddNeedVisible(true) }}>
                Додати
              </Button>
            )}
          >
            {needs.length === 0 ? (
              <Text type="secondary">Немає потреб</Text>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {needs.map((need) => (
                  <div key={need.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border-light)', background: 'var(--color-bg)' }}>
                    <Flex align="flex-start" justify="space-between" gap={8}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {(need.personId || need.userId) ? (
                          <a
                            onClick={() => navigate(need.personId ? `/people/${need.personId}` : `/admins/${need.userId}`)}
                            style={{ fontWeight: 600, display: 'block', marginBottom: 2, cursor: 'pointer' }}
                          >
                            {need.subjectName} →
                          </a>
                        ) : (
                          <Text strong style={{ display: 'block', marginBottom: 2 }}>{need.subjectName}</Text>
                        )}
                        <Text type="secondary" style={{ fontSize: 13 }}>{need.description}</Text>
                      </div>
                      <Flex align="center" gap={4} style={{ flexShrink: 0 }}>
                        <NeedStatusDropdown need={need} onUpdate={(status) => updateNeed(need.id, need.subjectName, need.description, status, need.personId, need.userId)} />
                        {perms['groups.events.manage'] && (
                          <>
                            <Button size="small" type="text" icon={<EditOutlined />}
                              onClick={() => { setEditingNeed(need); editNeedForm.setFieldsValue({ subjectName: need.subjectName, description: need.description }) }} />
                            <Button size="small" type="text" danger icon={<DeleteOutlined />}
                              onClick={() => Modal.confirm({
                                title: 'Видалити потребу?', okText: 'Видалити', okType: 'danger', cancelText: 'Скасувати',
                                onOk: () => deleteNeed(need.id),
                              })} />
                          </>
                        )}
                      </Flex>
                    </Flex>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Org team */}
          <Card title="Орг команда" style={{ ...cardStyle, marginTop: 16 }}>
            {orgTeam.length === 0
              ? <Text type="secondary">Немає призначених адмінів</Text>
              : orgTeam.map((member) => <OrgMemberRowDesktop key={member.id} member={member} />)
            }
          </Card>
        </Col>
      </Row>

      {/* Edit group modal */}
      <Modal title="Редагувати групу" open={editGroupVisible} onCancel={() => setEditGroupVisible(false)} footer={null}>
        <Form form={editGroupForm} layout="vertical" onFinish={async (vals) => {
          await saveGroupInfo({
            name: vals.name, meetingDay: vals.meetingDay || undefined,
            meetingTime: vals.meetingTime ? vals.meetingTime.format('HH:mm') : undefined,
            meetingEndTime: vals.meetingEndTime ? vals.meetingEndTime.format('HH:mm') : undefined,
            location: vals.location || undefined, telegramGroupId: vals.telegramGroupId || undefined,
          })
          setEditGroupVisible(false)
        }}>
          <Form.Item name="name" label="Назва групи" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="meetingDay" label="День домашки">
            <Select allowClear placeholder="— не вибрано —" options={MEETING_DAYS.map((d) => ({ value: d, label: d }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="meetingTime" label="Початок"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="meetingEndTime" label="Кінець"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="location" label="Адреса"><Input placeholder="Адреса зустрічі" /></Form.Item>
          <Form.Item name="telegramGroupId" label="ID групи в Telegram"><Input placeholder="-1001234567890" /></Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setEditGroupVisible(false)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Зберегти</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Add need modal */}
      <Modal title="Нова потреба" open={addNeedVisible}
        onCancel={() => setAddNeedVisible(false)}
        afterOpenChange={(open) => { if (open) loadMembersForNeeds() }}
        footer={null}>
        <Form form={addNeedForm} layout="vertical" onFinish={async (vals) => {
          await addNeed(vals.subjectName.trim(), vals.description.trim(), addNeedPersonId, addNeedUserId)
          setAddNeedVisible(false); setAddNeedPersonId(null); setAddNeedUserId(null)
        }}>
          <Form.Item label="Вибрати з групи" style={{ marginBottom: 8 }}>
            <Select
              showSearch allowClear placeholder="Знайти члена групи..."
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={groupMembersForNeeds.map((m) => ({
                value: m.isAdmin ? `u${m.userId}` : `p${m.id}`,
                label: [m.name, m.lastName].filter(Boolean).join(' ') + (m.isAdmin ? ' (адмін)' : ''),
              }))}
              onChange={(val) => {
                if (!val) { setAddNeedPersonId(null); setAddNeedUserId(null); return }
                const member = groupMembersForNeeds.find((m) => (m.isAdmin ? `u${m.userId}` : `p${m.id}`) === val)
                if (!member) return
                const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
                addNeedForm.setFieldValue('subjectName', fullName)
                setAddNeedPersonId(member.isAdmin ? null : member.id)
                setAddNeedUserId(member.isAdmin ? (member.userId ?? null) : null)
              }}
            />
          </Form.Item>
          <Form.Item name="subjectName" label="Або введіть ім'я вручну" rules={[{ required: true }]}><Input autoFocus placeholder="Ім'я" /></Form.Item>
          <Form.Item name="description" label="Потреба" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="Опис потреби" /></Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setAddNeedVisible(false)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Додати</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Edit need modal */}
      <Modal title="Редагувати потребу" open={!!editingNeed}
        onCancel={() => setEditingNeed(null)}
        afterOpenChange={(open) => { if (open) loadMembersForNeeds() }}
        footer={null}>
        <Form form={editNeedForm} layout="vertical" onFinish={async (vals) => {
          if (!editingNeed) return
          const personId = editingNeed.personId ?? null
          const userId = editingNeed.userId ?? null
          await updateNeed(editingNeed.id, vals.subjectName.trim(), vals.description.trim(), editingNeed.status, personId, userId)
          setEditingNeed(null)
        }}>
          <Form.Item label="Змінити прив'язку до члена групи" style={{ marginBottom: 8 }}>
            <Select
              showSearch allowClear
              placeholder="Знайти члена групи..."
              defaultValue={editingNeed ? (editingNeed.personId ? `p${editingNeed.personId}` : editingNeed.userId ? `u${editingNeed.userId}` : undefined) : undefined}
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={groupMembersForNeeds.map((m) => ({
                value: m.isAdmin ? `u${m.userId}` : `p${m.id}`,
                label: [m.name, m.lastName].filter(Boolean).join(' ') + (m.isAdmin ? ' (адмін)' : ''),
              }))}
              onChange={(val) => {
                if (!val) {
                  setEditingNeed((n) => n ? { ...n, personId: null, userId: null } : n); return
                }
                const member = groupMembersForNeeds.find((m) => (m.isAdmin ? `u${m.userId}` : `p${m.id}`) === val)
                if (!member) return
                const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
                editNeedForm.setFieldValue('subjectName', fullName)
                setEditingNeed((n) => n ? { ...n, personId: member.isAdmin ? null : member.id, userId: member.isAdmin ? (member.userId ?? null) : null } : n)
              }}
            />
          </Form.Item>
          <Form.Item name="subjectName" label="Імʼя людини" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Потреба" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setEditingNeed(null)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Зберегти</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Add event modal */}
      <Modal title="Нова подія" open={addEventVisible} onCancel={() => setAddEventVisible(false)} footer={null}>
        <Form form={addEventForm} layout="vertical" onFinish={async (vals) => {
          const [, m, d] = vals.date.split('-').map(Number)
          await addEvent(vals.name.trim(), m, d)
          setAddEventVisible(false)
        }}>
          <Form.Item name="name" label="Назва" rules={[{ required: true }]}><Input autoFocus /></Form.Item>
          <Form.Item name="date" label="Дата" rules={[{ required: true }]}><input type="date" style={nativeDateStyle} /></Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setAddEventVisible(false)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Додати</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Edit event modal */}
      <Modal title="Редагувати подію" open={!!editingEvent} onCancel={() => setEditingEvent(null)} footer={null}>
        <Form form={editEventForm} layout="vertical" onFinish={async (vals) => {
          if (!editingEvent) return
          const [y, m, d] = vals.date.split('-').map(Number)
          await updateEvent(editingEvent.id, vals.name.trim(), m, d, y)
          setEditingEvent(null)
        }}>
          <Form.Item name="name" label="Назва" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="date" label="Дата" rules={[{ required: true }]}><input type="date" style={nativeDateStyle} /></Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setEditingEvent(null)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Зберегти</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Reschedule modal */}
      <Modal title="Перенести домашку" open={rescheduleVisible} onCancel={() => setRescheduleVisible(false)} footer={null}>
        <Form form={rescheduleForm} layout="vertical" onFinish={async (vals) => {
          await reschedule(vals.date, nextMeetingDate ?? undefined, vals.time ? vals.time.format('HH:mm') : undefined)
          setRescheduleVisible(false)
        }}>
          <Row gutter={12}>
            <Col span={14}><Form.Item name="date" label="Нова дата" rules={[{ required: true }]}><input type="date" style={nativeDateStyle} /></Form.Item></Col>
            <Col span={10}><Form.Item name="time" label="Час початку"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setRescheduleVisible(false)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Перенести</Button>
          </Flex>
        </Form>
      </Modal>

      {/* History drawer */}
      <Drawer
        title={historyMember ? `Історія — ${[historyMember.name, historyMember.lastName].filter(Boolean).join(' ')}` : 'Історія'}
        open={!!historyMember}
        onClose={() => setHistoryMember(null)}
        width={420}
      >
        {historyLoading
          ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>
          : historyEvents.length === 0
            ? <Text type="secondary">Немає записів</Text>
            : <Timeline items={historyEvents.map((e) => ({
                color: TIMELINE_COLORS[e.type] ?? '#9CA3AF',
                children: <TimelineEventLabel event={e} />,
              }))} />
        }
      </Drawer>

      {/* Transfer modal */}
      <Modal
        title={transferTarget ? `Перевести — ${[transferTarget.name, transferTarget.lastName].filter(Boolean).join(' ')}` : 'Перевести'}
        open={!!transferTarget}
        onCancel={() => setTransferTarget(null)}
        onOk={handleConfirmTransfer}
        okText="Перевести"
        cancelText="Скасувати"
        okButtonProps={{ loading: transferring, disabled: !transferToGroupId }}
        width={400}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>Оберіть домашку для переведення:</Text>
        <Select
          style={{ width: '100%' }}
          placeholder="Оберіть домашку..."
          value={transferToGroupId ?? undefined}
          onChange={setTransferToGroupId}
          options={allGroups.map((g) => ({ value: g.id, label: g.name }))}
          showSearch
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Modal>

      {/* Left date modal */}
      <Modal
        title="Налаштувати дату кінця"
        open={!!leftDateMember}
        onCancel={() => setLeftDateMember(null)}
        footer={null}
        width={360}
      >
        {leftDateMember && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {[leftDateMember.name, leftDateMember.lastName].filter(Boolean).join(' ')}
            </Text>
            <Form layout="vertical" onFinish={async () => {
              if (!leftDateValue) return
              setSavingLeftDate(true)
              try {
                await setMemberLeftAt(
                  leftDateMember.isAdmin ? null : leftDateMember.id,
                  leftDateMember.isAdmin ? (leftDateMember.userId ?? null) : null,
                  leftDateValue,
                )
                setLeftDateMember(null)
              } finally {
                setSavingLeftDate(false)
              }
            }}>
              <Form.Item label="Дата виходу">
                <input type="date" value={leftDateValue} onChange={(e) => setLeftDateValue(e.target.value)} style={nativeDateStyle} />
              </Form.Item>
              <Flex justify="flex-end" gap={8}>
                <Button onClick={() => setLeftDateMember(null)}>Скасувати</Button>
                <Button type="primary" htmlType="submit" loading={savingLeftDate}>Зберегти</Button>
              </Flex>
            </Form>
          </>
        )}
      </Modal>

      {/* Set join date modal */}
      <Modal
        title="Налаштувати дату початку"
        open={!!joinDateMember}
        onCancel={() => setJoinDateMember(null)}
        footer={null}
        width={360}
      >
        {joinDateMember && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {[joinDateMember.name, joinDateMember.lastName].filter(Boolean).join(' ')}
            </Text>
            <Form layout="vertical" onFinish={async () => {
              if (!joinDateValue) return
              setSavingJoinDate(true)
              try {
                await setMemberJoinedAt(
                  joinDateMember.isAdmin ? null : joinDateMember.id,
                  joinDateMember.isAdmin ? (joinDateMember.userId ?? null) : null,
                  joinDateValue,
                )
                setJoinDateMember(null)
              } finally {
                setSavingJoinDate(false)
              }
            }}>
              <Form.Item label="Дата приєднання">
                <input
                  type="date"
                  value={joinDateValue}
                  onChange={(e) => setJoinDateValue(e.target.value)}
                  style={nativeDateStyle}
                />
              </Form.Item>
              <Flex justify="flex-end" gap={8}>
                <Button onClick={() => setJoinDateMember(null)}>Скасувати</Button>
                <Button type="primary" htmlType="submit" loading={savingJoinDate}>Зберегти</Button>
              </Flex>
            </Form>
          </>
        )}
      </Modal>

      {/* Room picker modal */}
      <Modal title={`Бронювання кімнати${nextMeetingDate ? ` — ${formatDateUk(nextMeetingDate)}` : ''}`}
        open={roomDrawerVisible} onCancel={() => setRoomDrawerVisible(false)} footer={null} width={480}>
        <Flex justify="space-between" align="center" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg)', marginBottom: 16 }}>
          <div>
            <Text strong>Автобронювання</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Бронювати цю кімнату автоматично щозустрічі</Text>
          </div>
          <Switch checked={autoBook} onChange={setAutoBook} />
        </Flex>
        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Кімната</Text>
        <Flex vertical gap={6} style={{ marginBottom: 16 }}>
          <button onClick={() => setSelectedRoomId(null)} style={{ ...roomBtn, borderColor: selectedRoomId === null ? 'var(--color-primary)' : 'var(--color-border)', background: selectedRoomId === null ? 'rgba(42,175,202,0.06)' : '#fff' }}>
            <Text type="secondary">Без кімнати</Text>
          </button>
          {rooms.map((room) => {
            const isBusy = busyRoomIds.has(room.id) && room.id !== nextMeetingRoomId
            return (
              <button key={room.id} onClick={() => setSelectedRoomId(room.id)} style={{ ...roomBtn, borderColor: selectedRoomId === room.id ? room.color : 'var(--color-border)', background: selectedRoomId === room.id ? `${room.color}10` : '#fff' }}>
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={8}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: room.color }} />
                    <Text strong>{room.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{room.building} · пов. {room.floor}</Text>
                  </Flex>
                  {isBusy && <Text style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>зайнято</Text>}
                </Flex>
              </button>
            )
          })}
        </Flex>
        {selectedRoomId !== null && busyRoomIds.has(selectedRoomId) && selectedRoomId !== nextMeetingRoomId && (
          <Alert type="warning" message={`${rooms.find((r) => r.id === selectedRoomId)?.name} зайнято на цей час — оберіть іншу кімнату`} style={{ marginBottom: 12 }} />
        )}
        <Divider style={{ margin: '12px 0' }} />
        <Flex justify="flex-end" gap={8}>
          <Button onClick={() => setRoomDrawerVisible(false)}>Скасувати</Button>
          <Button type="primary" loading={bookingLoading}
            disabled={selectedRoomId !== null && busyRoomIds.has(selectedRoomId) && selectedRoomId !== nextMeetingRoomId}
            onClick={handleBookRoom}>Зберегти</Button>
        </Flex>
      </Modal>
    </div>
  )
}

// ── Org member row ────────────────────────────────────────────────────────────

function OrgMemberRowDesktop({ member }: { member: GroupCabinet['orgTeam'][0] }) {
  const navigate = useNavigate()
  const canViewPeople = usePermission('people.view')
  const canViewAdmins = usePermission('admins.viewProfiles')
  const [open, setOpen] = useState(false)
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')

  return (
    <div style={{ marginBottom: 8 }}>
      <Flex align="center" justify="space-between" style={{ padding: '6px 0' }}>
        <Flex align="center" gap={8} wrap="wrap" style={{ flex: 1 }}>
          <Text
            strong
            onClick={() => { if (canViewAdmins) navigate(`/admins/${member.id}`) }}
            style={{ cursor: canViewAdmins ? 'pointer' : 'default', color: canViewAdmins ? 'var(--color-primary)' : undefined }}
          >{fullName}</Text>
          {member.role && <Tag style={{ background: `${member.role.color}20`, color: member.role.color, border: 'none' }}>{member.role.name}</Tag>}
          <Text type="secondary" style={{ fontSize: 13 }}>{member.overseeCount} під опікою</Text>
        </Flex>
        <Button type="text" size="small" icon={open ? <UpOutlined /> : <DownOutlined />} onClick={() => setOpen((v) => !v)} style={{ color: 'var(--color-text-tertiary)' }} />
      </Flex>
      {open && (
        <div style={{ paddingLeft: 16, borderLeft: '2px solid var(--color-border-light)', marginTop: 4 }}>
          {member.oversees.length === 0
            ? <Text type="secondary" style={{ fontSize: 13 }}>Немає людей під опікою</Text>
            : member.oversees.map((p) => (
              <Flex key={p.id} align="center" justify="space-between" style={{ padding: '3px 0' }}>
                <Text style={{ fontSize: 13 }}>{p.fullName}</Text>
                {canViewPeople && <Button size="small" type="text" icon={<RightOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/people/${p.id}`) }} />}
              </Flex>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRowDesktop({ member, navigate, onViewHistory, onSetJoinDate, onSetLeftDate, onTransfer, onRemove }: {
  member: GroupMember
  navigate: ReturnType<typeof useNavigate>
  onViewHistory: (m: GroupMember) => void
  onSetJoinDate: (m: GroupMember) => void
  onSetLeftDate: (m: GroupMember) => void
  onTransfer: (m: GroupMember) => void
  onRemove: (m: GroupMember) => void
}) {
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')
  const dateLabel = member.isFormer
    ? (member.leftAt ? `виб. ${new Date(member.leftAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}` : null)
    : (member.joinedAt ? `з ${new Date(member.joinedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}` : null)

  const menuItems = member.isFormer
    ? [
        { key: 'view', label: 'Переглянути' },
        { key: 'history', label: 'Історія' },
        { key: 'join-date', label: 'Налаштувати дату початку' },
        { key: 'left-date', label: 'Налаштувати дату кінця' },
      ]
    : [
        { key: 'view', label: 'Переглянути' },
        { key: 'history', label: 'Історія' },
        { key: 'join-date', label: 'Налаштувати дату початку' },
        { key: 'transfer', label: 'Перевести на іншу домашку' },
        ...(!member.isAdmin ? [{ key: 'remove', label: 'Вилучити з домашки', danger: true }] : []),
      ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'view') navigate(member.isAdmin ? `/admins/${member.userId}` : `/people/${member.id}`)
    if (key === 'history') onViewHistory(member)
    if (key === 'join-date') onSetJoinDate(member)
    if (key === 'left-date') onSetLeftDate(member)
    if (key === 'transfer') onTransfer(member)
    if (key === 'remove') onRemove(member)
  }

  return (
    <Flex align="center" gap={8} style={{ padding: '7px 0', borderBottom: '1px solid var(--color-border-light)', opacity: member.isFormer ? 0.6 : 1 }}>
      <Flex align="center" gap={6} style={{ flex: 1, minWidth: 0 }}>
        <Text
          strong={!member.isFormer}
          onClick={() => navigate(member.isAdmin ? `/admins/${member.userId}` : `/people/${member.id}`)}
          style={{ cursor: 'pointer', color: member.isFormer ? 'var(--color-text-secondary)' : 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >{fullName}</Text>
        {member.isAdmin && member.roleTag && (
          <Tag style={{ background: `${member.roleTag.color}20`, color: member.roleTag.color, border: 'none', fontSize: 11, flexShrink: 0 }}>{member.roleTag.name}</Tag>
        )}
        {member.isFormer && <Tag style={{ border: 'none', background: '#F3F4F6', color: '#6B7280', fontSize: 10, flexShrink: 0 }}>колишній</Tag>}
      </Flex>
      {dateLabel
        ? <Text type="secondary" style={{ fontSize: 12, flexShrink: 0, minWidth: 110, textAlign: 'right' }}>{dateLabel}</Text>
        : <span style={{ minWidth: 110 }} />
      }
      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
        <Button type="text" size="small" style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>•••</Button>
      </Dropdown>
    </Flex>
  )
}

// ── Need status dropdown ──────────────────────────────────────────────────────

const NEED_STATUS_CONFIG = {
  active:     { label: 'Активна',            color: 'blue'    },
  answered:   { label: 'Отримана відповідь', color: 'green'   },
  irrelevant: { label: 'Не актуальна',       color: 'default' },
} as const

function NeedStatusDropdown({ need, onUpdate }: { need: GroupNeed; onUpdate: (status: string) => void }) {
  const cfg = NEED_STATUS_CONFIG[need.status as keyof typeof NEED_STATUS_CONFIG] ?? NEED_STATUS_CONFIG.active
  const items = Object.entries(NEED_STATUS_CONFIG).map(([key, val]) => ({ key, label: val.label }))
  return (
    <Dropdown menu={{ items, onClick: ({ key }) => onUpdate(key) }} trigger={['click']}>
      <Tag color={cfg.color} style={{ cursor: 'pointer', userSelect: 'none' }}>{cfg.label} ▾</Tag>
    </Dropdown>
  )
}

// ── Timeline helpers ──────────────────────────────────────────────────────────

const TIMELINE_COLORS: Record<string, string> = {
  group_joined:    '#16A34A',
  group_left:      '#DC2626',
  status_change:   '#2563EB',
  oversight_change:'#7C3AED',
}

function TimelineEventLabel({ event }: { event: TimelineEvent }) {
  const { Text } = Typography
  const date = new Date(event.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })

  if (event.type === 'group_joined') return (
    <div>
      <Text strong>Приєднався до «{event.groupName}»</Text>
      <br /><Text type="secondary" style={{ fontSize: 12 }}>{date}</Text>
    </div>
  )
  if (event.type === 'group_left') return (
    <div>
      <Text strong>Покинув «{event.groupName}»</Text>
      <br /><Text type="secondary" style={{ fontSize: 12 }}>{date}</Text>
    </div>
  )
  if (event.type === 'status_change') return (
    <div>
      <Text strong>Статус змінено</Text>
      {event.oldStatusName && <> <Text type="secondary">{event.oldStatusName}</Text> <Text>→</Text></>}
      {event.statusName && (
        <Tag style={{ background: `${event.statusColor ?? '#888'}20`, color: event.statusColor ?? '#888', border: 'none', marginLeft: 4 }}>{event.statusName}</Tag>
      )}
      <br /><Text type="secondary" style={{ fontSize: 12 }}>{date}</Text>
    </div>
  )
  if (event.type === 'oversight_change') {
    const added = event.oversightName && !event.oldOversightName
    const removed = !event.oversightName && event.oldOversightName
    const changed = event.oversightName && event.oldOversightName
    return (
      <div>
        {added && <Text strong>Призначено опікуна: {event.oversightName}</Text>}
        {removed && <Text strong>Знято опікуна: {event.oldOversightName}</Text>}
        {changed && <Text strong>Опікун: {event.oldOversightName} → {event.oversightName}</Text>}
        <br /><Text type="secondary" style={{ fontSize: 12 }}>{date}</Text>
      </div>
    )
  }
  return <Text>{date}</Text>
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = { borderRadius: 12, boxShadow: 'var(--shadow-sm)' }
const nativeDateStyle: React.CSSProperties = { width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, color: 'var(--color-text)', outline: 'none' }
const roomBtn: React.CSSProperties = { width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: '2px solid', background: '#fff', cursor: 'pointer' }
