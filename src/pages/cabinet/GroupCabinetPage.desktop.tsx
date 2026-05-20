import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Spin, Empty, Modal, Form, Input, Select, TimePicker, Tag, Row, Col, Statistic, Typography, Flex, Alert, Divider, Switch } from 'antd'
import { EditOutlined, PlusOutlined, DeleteOutlined, RightOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { groupsApi } from '@/api/groups'
import { useAuth } from '@/store/auth'
import { usePermission, usePermissions } from '@/hooks/usePermission'
import { useCabinetData, computePrevMeetingDate, formatDateUk, formatBirthday, formatEventDate } from './useCabinetData'
import type { Group, GroupCabinet, GroupEvent } from '@/types'

const ADMIN_ROLES = ['SuperAdmin', 'Admin']
const MEETING_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

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
    'groups.edit', 'groups.nextMeeting.manage', 'groups.events.manage',
    'attendance.record', 'planning.view', 'planning.sendToTelegram',
  ])
  const {
    cabinet, rooms, events, loading, reload,
    busyRoomIds, addEvent, updateEvent, deleteEvent,
    reschedule, bookRoom, sendPlan, saveGroupInfo, deletePlan,
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
  const [editGroupForm] = Form.useForm()

  if (loading || !cabinet) return (
    <div style={{ padding: '28px 32px' }}>
      <Flex justify="center" style={{ padding: 64 }}><Spin size="large" /></Flex>
    </div>
  )

  const { group, nextMeetingDate, lastMeetingDate, lastAttendance, upcomingEvents, orgTeam, stats,
    hasPlanForNextMeeting, nextMeetingRoomId, nextMeetingConflicts } = cabinet

  const attendancePct = lastAttendance ? Math.round(lastAttendance.present * 100 / (lastAttendance.total || 1)) : null
  const attendanceDate = lastMeetingDate ?? computePrevMeetingDate(group.meetingDay)
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
                <Button size="small" onClick={() => { rescheduleForm.setFieldsValue({ date: nextMeetingDate ?? '' }); setRescheduleVisible(true) }}>Перенести</Button>
              )}
              {perms['groups.nextMeeting.manage'] && (
                <Button size="small" danger disabled={!nextMeetingDate} onClick={handleSkipMeeting}>Скасувати</Button>
              )}
              {perms['planning.sendToTelegram'] && (
                <Button size="small" type="primary" loading={sendingPlan}
                  disabled={!hasPlanForNextMeeting || !group.telegramGroupId}
                  onClick={async () => {
                    if (!nextMeetingDate) return
                    setSendingPlan(true)
                    try { await sendPlan(nextMeetingDate) } finally { setSendingPlan(false) }
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
          await reschedule(vals.date, nextMeetingDate ?? undefined)
          setRescheduleVisible(false)
        }}>
          <Form.Item name="date" label="Нова дата" rules={[{ required: true }]}><input type="date" style={nativeDateStyle} /></Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setRescheduleVisible(false)}>Скасувати</Button>
            <Button type="primary" htmlType="submit">Перенести</Button>
          </Flex>
        </Form>
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
  const [open, setOpen] = useState(false)
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')

  return (
    <div style={{ marginBottom: 8 }}>
      <Flex align="center" justify="space-between" style={{ cursor: 'pointer', padding: '6px 0' }} onClick={() => setOpen((v) => !v)}>
        <Flex align="center" gap={8} wrap="wrap">
          <Text strong>{fullName}</Text>
          {member.role && <Tag style={{ background: `${member.role.color}20`, color: member.role.color, border: 'none' }}>{member.role.name}</Tag>}
          <Text type="secondary" style={{ fontSize: 13 }}>{member.overseeCount} під опікою</Text>
        </Flex>
        {open ? <UpOutlined style={{ color: 'var(--color-text-tertiary)' }} /> : <DownOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = { borderRadius: 12, boxShadow: 'var(--shadow-sm)' }
const nativeDateStyle: React.CSSProperties = { width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, color: 'var(--color-text)', outline: 'none' }
const roomBtn: React.CSSProperties = { width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: '2px solid', background: '#fff', cursor: 'pointer' }
