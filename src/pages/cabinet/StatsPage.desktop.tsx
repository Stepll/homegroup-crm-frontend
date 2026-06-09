import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Typography, Space, Card, Row, Col, Statistic, Progress, Spin, Segmented } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import { dashboardApi, type InactiveMember, type StatusDistributionResponse } from '@/api/dashboard'
import type { GroupStats } from '@/types'

const { Title, Text } = Typography

type Period = '1m' | '3m' | '6m'
const PERIODS: { value: Period; label: string }[] = [
  { value: '1m', label: '1 місяць' },
  { value: '3m', label: '3 місяці' },
  { value: '6m', label: '6 місяців' },
]

function PrevSuffix({ curr, prev, fmt = (v: number) => String(v) }: { curr: number; prev: number; fmt?: (v: number) => string }) {
  const diff = curr - prev
  if (diff === 0) return <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginLeft: 4 }}>{fmt(prev)}</span>
  return (
    <span style={{ fontSize: 11, marginLeft: 4 }}>
      <span style={{ color: 'rgba(0,0,0,0.35)' }}>{fmt(prev)}</span>
      <span style={{ color: diff > 0 ? '#22C55E' : '#EF4444', marginLeft: 2 }}>{diff > 0 ? '↑' : '↓'}</span>
    </span>
  )
}

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
  const [atRisk, setAtRisk] = useState<InactiveMember[]>([])
  const [statusDist, setStatusDist] = useState<StatusDistributionResponse | null>(null)

  useEffect(() => {
    setLoading(true)
    groupsApi.getStats(groupId, period).then(setStats).finally(() => setLoading(false))
  }, [groupId, period])

  useEffect(() => {
    dashboardApi.inactiveMembers(groupId, 3).then(setAtRisk).catch(() => setAtRisk([]))
    dashboardApi.statusDistribution(groupId).then(setStatusDist).catch(() => setStatusDist(null))
  }, [groupId])

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
              <Card><Statistic title="Ср. відвідуваність" value={`${stats.summary.avgAttendanceRate}%`} valueStyle={{ color: '#2AAFCA' }} suffix={<PrevSuffix curr={stats.summary.avgAttendanceRate} prev={stats.summary.prevAvgAttendanceRate} fmt={(v: number) => `${v}%`} />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Нових членів" value={stats.summary.newMembers} suffix={<PrevSuffix curr={stats.summary.newMembers} prev={stats.summary.prevNewMembers} />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card><Statistic title="Учасників" value={stats.summary.totalMembers} suffix={<PrevSuffix curr={stats.summary.totalMembers} prev={stats.summary.prevTotalMembers} />} /></Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic title="Зустрічей" value={stats.summary.meetingCount} />
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>Гостей: {stats.summary.totalGuests}</div>
              </Card>
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
                      <div style={{ marginLeft: 28 }}>
                        <Progress percent={p.attendanceRate} showInfo={false} strokeColor={rateColor} size="small" style={{ marginBottom: 0 }} />
                      </div>
                    </div>
                  )
                })}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {(atRisk.length > 0 || (statusDist && statusDist.totalPeople > 0)) && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {atRisk.length > 0 && (
            <Col xs={24} lg={12}>
              <Card title="Під ризиком" extra={<Text type="secondary" style={{ fontSize: 12 }}>3+ пропуски поспіль</Text>}>
                {atRisk.map((m) => {
                  const key = m.personId ? `p_${m.personId}` : `u_${m.userId}`
                  const lastDate = m.lastAttendedDate
                    ? new Date(m.lastAttendedDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
                    : '—'
                  return (
                    <div key={key}
                      onClick={() => navigate(m.personId ? `/people/${m.personId}` : `/admins/${m.userId}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                      <div>
                        <Text style={{ fontWeight: 500 }}>{m.fullName}</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 1 }}>Останній раз: {lastDate}</Text>
                      </div>
                      <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {m.missedCount} пропусків
                      </span>
                    </div>
                  )
                })}
              </Card>
            </Col>
          )}
          {statusDist && statusDist.totalPeople > 0 && (
            <Col xs={24} lg={12}>
              <Card title="Розподіл за статусом">
                <StatusPieChart items={statusDist.items} total={statusDist.totalPeople} />
              </Card>
            </Col>
          )}
        </Row>
      )}
    </div>
  )
}

function StatusPieChart({ items, total }: { items: StatusDistributionResponse['items']; total: number }) {
  const size = 160, r = 70, cx = size / 2, cy = size / 2
  let cum = 0
  const segments = items.map((it) => {
    const pct = it.count / total
    const start = cum * 2 * Math.PI; cum += pct; const end = cum * 2 * Math.PI
    return { ...it, start, end }
  })
  const arc = (s: number, e: number) => {
    if (e - s >= 2 * Math.PI - 0.001)
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
    const x1 = cx + r * Math.sin(s), y1 = cy - r * Math.cos(s)
    const x2 = cx + r * Math.sin(e), y2 = cy - r * Math.cos(e)
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${e - s > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`
  }
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => <path key={i} d={arc(s.start, s.end)} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={36} fill="#fff" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill="rgba(0,0,0,0.85)">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="rgba(0,0,0,0.45)">людей</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: it.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{it.count} <span style={{ color: 'rgba(0,0,0,0.35)', fontWeight: 400 }}>· {Math.round(it.count * 100 / total)}%</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}
