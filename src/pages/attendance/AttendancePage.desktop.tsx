import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Select, InputNumber, Typography, Space, Card, Progress, Checkbox, Input, Modal } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import { attendanceApi } from '@/api/attendance'
import { calendarApi } from '@/api/calendar'
import type { GroupMember } from '@/types'

const { Title, Text } = Typography

function memberKey(m: GroupMember) {
  return m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
}

function formatMeetingDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short', year: 'numeric' })
}

export function AttendancePageDesktop() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(searchParams.get('date') ?? new Date().toISOString().split('T')[0])
  const [guestCount, setGuestCount] = useState(0)
  const [guestInfo, setGuestInfo] = useState('')
  const [showGuestInfo, setShowGuestInfo] = useState(false)
  const initialDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const [meetingDates, setMeetingDates] = useState<string[]>([initialDate])

  useEffect(() => {
    groupsApi.getMembers(Number(id)).then((m) => setMembers(m.filter(member => !member.isFormer))).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const initDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
    const datesP = attendanceApi.getMeetingDates(Number(id)).catch(() => [] as string[])
    const today = new Date().toISOString().split('T')[0]
    const eightWeeksAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 56); return d.toISOString().split('T')[0] })()
    const calP = calendarApi.getOccurrences({ from: eightWeeksAgo, to: today, types: 'HomeGroup', groupIds: String(id) }).catch(() => [])
    Promise.all([datesP, calP]).then(([fromDb, occurrences]) => {
      const fromCalendar = occurrences.filter(o => o.homeGroupId === Number(id)).map(o => o.date)
      const merged = Array.from(new Set([...fromDb, ...fromCalendar, initDate])).sort((a, b) => b.localeCompare(a))
      setMeetingDates(merged)
    })
  }, [id])

  useEffect(() => {
    attendanceApi.getByGroup(Number(id), date, date).then((records) => {
      const keys = new Set<string>(
        records.filter((r) => r.wasPresent).map((r) => r.userId != null ? `u_${r.userId}` : `p_${r.personId}`)
      )
      setPresent(keys)
    }).catch(() => setPresent(new Set()))
  }, [id, date])

  useEffect(() => {
    attendanceApi.getMeta(Number(id), date).then((meta) => {
      setGuestCount(meta.guestCount); setGuestInfo(meta.guestInfo ?? ''); setShowGuestInfo(!!meta.guestInfo)
    }).catch(() => { setGuestCount(0); setGuestInfo('') })
  }, [id, date])

  const toggle = (m: GroupMember) => {
    const key = memberKey(m)
    setPresent((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all([
        attendanceApi.record({
          homeGroupId: Number(id), meetingDate: date,
          entries: members.map((m) => ({
            personId: m.isAdmin ? undefined : m.id,
            userId: m.isAdmin ? m.userId : undefined,
            wasPresent: present.has(memberKey(m)),
          })),
        }),
        attendanceApi.saveMeta({ homeGroupId: Number(id), meetingDate: date, guestCount, guestInfo: guestInfo.trim() || undefined, isCancelled: false }),
      ])
      navigate(`/cabinet/${id}`)
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally { setSaving(false) }
  }

  const presentCount = present.size
  const totalCount = members.length
  const pct = totalCount > 0 ? Math.round(presentCount * 100 / totalCount) : 0

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/cabinet/${id}`)}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>Відвідуваність</Title>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <Select
            value={date}
            onChange={setDate}
            style={{ minWidth: 280 }}
            options={meetingDates.map((d) => ({ label: formatMeetingDate(d), value: d }))}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginLeft: 'auto' }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{presentCount}</span>
            <Text type="secondary">/{totalCount}</Text>
            <Text type="secondary" style={{ marginLeft: 4 }}>{pct}%</Text>
          </div>
        </div>
        <Progress percent={pct} showInfo={false} strokeColor="#2AAFCA" />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button size="small" onClick={() => setPresent(new Set(members.map(memberKey)))}>Всі присутні</Button>
          <Button size="small" onClick={() => setPresent(new Set())}>Всі відсутні</Button>
        </div>
      </Card>

      <Card title="Гості" style={{ marginBottom: 16 }}>
        <Space>
          <InputNumber min={0} value={guestCount} onChange={(v) => setGuestCount(v ?? 0)} />
          <Button type="link" size="small" onClick={() => setShowGuestInfo((v) => !v)}>
            {showGuestInfo ? 'Приховати' : 'Вказати інформацію'}
          </Button>
        </Space>
        {showGuestInfo && (
          <Input.TextArea
            value={guestInfo}
            onChange={(e) => setGuestInfo(e.target.value)}
            placeholder="Імена, контакти або нотатки про гостей..."
            rows={2}
            style={{ marginTop: 10 }}
          />
        )}
      </Card>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {members.map((m) => {
            const key = memberKey(m)
            const isPresent = present.has(key)
            const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
            return (
              <div
                key={key}
                onClick={() => toggle(m)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', cursor: 'pointer', borderRadius: 8,
                  background: isPresent ? 'rgba(34,197,94,0.07)' : undefined,
                  border: `1px solid ${isPresent ? 'rgba(34,197,94,0.25)' : 'transparent'}`,
                  transition: 'all 0.12s',
                }}
              >
                <Space>
                  <Checkbox checked={isPresent} onChange={() => toggle(m)} onClick={(e) => e.stopPropagation()} />
                  <span style={{ fontWeight: 500, color: isPresent ? '#16a34a' : undefined }}>{fullName}</span>
                  {m.isAdmin && m.roleTag && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: m.roleTag.color, background: `${m.roleTag.color}18`, padding: '1px 6px', borderRadius: 4 }}>
                      {m.roleTag.name}
                    </span>
                  )}
                </Space>
                {isPresent
                  ? <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 18 }} />
                  : <CloseCircleOutlined style={{ color: 'rgba(0,0,0,0.2)', fontSize: 18 }} />
                }
              </div>
            )
          })}
        </div>
      </Card>

      <Button
        type="primary" size="large" loading={saving} onClick={save}
        style={{ width: '100%', fontWeight: 600 }}
      >
        {`Зберегти · ${presentCount} з ${totalCount}`}
      </Button>
    </div>
  )
}
