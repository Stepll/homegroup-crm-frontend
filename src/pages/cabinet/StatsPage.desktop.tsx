import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Typography, Space, Card, Row, Col, Statistic, Progress, Spin, Segmented } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import type { GroupStats } from '@/types'

const { Title, Text } = Typography

type Period = '1m' | '3m' | '6m'
const PERIODS: { value: Period; label: string }[] = [
  { value: '1m', label: '1 місяць' },
  { value: '3m', label: '3 місяці' },
  { value: '6m', label: '6 місяців' },
]

function AttendanceChart({ meetings }: { meetings: GroupStats['meetings'] }) {
  if (meetings.length === 0) return null
  const CHART_H = 140
  const maxVal = Math.max(...meetings.map((m) => m.presentCount + m.guestCount), 1)
  const fmtLabel = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}.${m}` }

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: meetings.length * 44, paddingTop: 8 }}>
          {meetings.map((m) => {
            const total = m.presentCount + m.guestCount
            const fullH = Math.max(Math.round((total / maxVal) * CHART_H), total > 0 ? 3 : 0)
            const guestH = total > 0 ? Math.round((m.guestCount / total) * fullH) : 0
            const memberH = fullH - guestH
            return (
              <div key={m.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 36px' }}>
                <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>{total > 0 ? total : ''}</span>
                <div style={{ width: 24, display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                  {guestH > 0 && <div style={{ height: guestH, background: '#F97316' }} />}
                  {memberH > 0 && <div style={{ height: memberH, background: '#2AAFCA' }} />}
                  {fullH === 0 && <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 4 }} />}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', marginTop: 4, whiteSpace: 'nowrap' }}>{fmtLabel(m.date)}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <Space size={4}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2AAFCA' }} />
          <Text style={{ fontSize: 11 }} type="secondary">Члени</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F97316' }} />
          <Text style={{ fontSize: 11 }} type="secondary">Гості</Text>
        </Space>
      </div>
    </div>
  )
}

export function StatsPageDesktop() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const groupId = Number(id)
  const [period, setPeriod] = useState<Period>('3m')
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    groupsApi.getStats(groupId, period).then(setStats).finally(() => setLoading(false))
  }, [groupId, period])

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
          <Title level={3} style={{ margin: 0 }}>Статистика</Title>
        </Space>
        <Segmented
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={PERIODS}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : !stats || stats.meetings.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.35)', paddingTop: 60 }}>
          За цей період немає даних про відвідуваність
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Ср. відвідуваність" value={`${stats.summary.avgAttendanceRate}%`} valueStyle={{ color: '#2AAFCA' }} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Зустрічей" value={stats.summary.meetingCount} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Гостей" value={stats.summary.totalGuests} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Нових членів" value={stats.summary.newMembers} /></Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Відвідуваність по зустрічах" style={{ marginBottom: 16 }}>
                <AttendanceChart meetings={stats.meetings} />
              </Card>

              <Card title="Минулі зустрічі">
                {[...stats.meetings].reverse().map((m) => {
                  const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })
                  const rateColor = m.attendanceRate >= 80 ? '#22c55e' : m.attendanceRate >= 50 ? '#F97316' : '#ef4444'
                  return (
                    <div key={m.date} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <Text strong>{fmtDate(m.date)}</Text>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                            {m.presentCount}/{m.totalMembers} учасників{m.guestCount > 0 ? ` · ${m.guestCount} гостей` : ''}
                          </Text>
                        </div>
                        <Text strong style={{ color: rateColor, fontSize: 16 }}>{m.attendanceRate}%</Text>
                      </div>
                      {m.absentees.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                          Відсутні: {m.absentees.join(', ')}
                        </Text>
                      )}
                    </div>
                  )
                })}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Рейтинг присутності">
                {stats.personStats.map((p, i) => {
                  const rateColor = p.attendanceRate >= 80 ? '#22c55e' : p.attendanceRate >= 50 ? '#F97316' : '#ef4444'
                  return (
                    <div key={p.personId} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Space>
                          <Text type="secondary" style={{ minWidth: 20 }}>{i + 1}.</Text>
                          <Text style={{ fontWeight: 500 }}>{p.fullName}</Text>
                        </Space>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>{p.presentCount}/{p.totalMeetings}</Text>
                          <Text strong style={{ color: rateColor }}>{p.attendanceRate}%</Text>
                        </Space>
                      </div>
                      <Progress
                        percent={p.attendanceRate}
                        showInfo={false}
                        strokeColor={rateColor}
                        size="small"
                        style={{ marginLeft: 28, marginBottom: 0 }}
                      />
                    </div>
                  )
                })}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}
