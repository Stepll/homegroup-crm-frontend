import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import { dashboardApi, type InactiveMember, type StatusDistributionResponse } from '@/api/dashboard'
import type { GroupStats } from '@/types'

type Period = '1m' | '3m' | '6m'

const PERIODS: { key: Period; label: string }[] = [
  { key: '1m', label: '1 міс' },
  { key: '3m', label: '3 міс' },
  { key: '6m', label: '6 міс' },
]

// ── Stacked bar chart ─────────────────────────────────────────────────────────

function AttendanceChart({ meetings }: { meetings: GroupStats['meetings'] }) {
  if (meetings.length === 0) return null

  const CHART_H = 110
  const maxVal = Math.max(...meetings.map((m) => m.presentCount + m.guestCount), 1)

  const fmtLabel = (iso: string) => {
    const [, m, d] = iso.split('-')
    return `${d}.${m}`
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 5,
          minWidth: meetings.length * 36, paddingTop: 8,
        }}>
          {meetings.map((m) => {
            const total = m.presentCount + m.guestCount
            const fullH = Math.max(Math.round((total / maxVal) * CHART_H), total > 0 ? 3 : 0)
            const guestH = total > 0 ? Math.round((m.guestCount / total) * fullH) : 0
            const memberH = fullH - guestH

            return (
              <div key={m.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: `0 0 30px` }}>
                <div style={{ width: 20, display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                  {guestH > 0 && (
                    <div style={{ height: guestH, background: '#F97316' }} />
                  )}
                  {memberH > 0 && (
                    <div style={{ height: memberH, background: 'var(--color-primary)' }} />
                  )}
                  {fullH === 0 && (
                    <div style={{ height: 3, background: 'var(--color-border-light)', borderRadius: 4 }} />
                  )}
                </div>
                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {fmtLabel(m.date)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Члени</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F97316', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Гості</span>
        </div>
      </div>
    </div>
  )
}

// ── Person row with mini progress bar ─────────────────────────────────────────

function PersonRow({ person, rank }: { person: GroupStats['personStats'][0]; rank: number }) {
  const rate = person.attendanceRate
  const barColor = rate >= 80 ? '#22c55e' : rate >= 50 ? '#F97316' : '#ef4444'

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 18 }}>{rank}.</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{person.fullName}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{rate}%</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 5 }}>
            {person.presentCount}/{person.totalMeetings}
          </span>
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--color-border-light)', borderRadius: 2, marginLeft: 26 }}>
        <div style={{ height: '100%', width: `${rate}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ── Meeting row ───────────────────────────────────────────────────────────────

function MeetingRow({ meeting }: { meeting: GroupStats['meetings'][0] }) {
  const [open, setOpen] = useState(false)

  const fmt = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '11px 0', textAlign: 'left', cursor: 'pointer', borderBottom: open ? 'none' : '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{fmt(meeting.date)}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {meeting.presentCount}/{meeting.totalMembers} учасників
              {meeting.guestCount > 0 && ` · ${meeting.guestCount} гостей`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: meeting.attendanceRate >= 80 ? '#22c55e' : meeting.attendanceRate >= 50 ? '#F97316' : '#ef4444',
            }}>
              {meeting.attendanceRate}%
            </span>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {open ? '▲' : '▼'}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ paddingLeft: 12, paddingBottom: 10, borderBottom: '1px solid var(--color-border-light)', borderLeft: '2px solid var(--color-border-light)' }}>
          {meeting.absentees.length === 0 ? (
            <div style={{ fontSize: 13, color: '#22c55e', padding: '4px 0' }}>Всі були присутні</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, marginTop: 2 }}>
                Відсутні
              </div>
              {meeting.absentees.map((name) => (
                <div key={name} style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '2px 0' }}>{name}</div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stats page ────────────────────────────────────────────────────────────────

export function StatsPageMobile() {
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
    groupsApi.getStats(groupId, period)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [groupId, period])

  useEffect(() => {
    dashboardApi.inactiveMembers(groupId, 3).then(setAtRisk).catch(() => setAtRisk([]))
    dashboardApi.statusDistribution(groupId).then(setStatusDist).catch(() => setStatusDist(null))
  }, [groupId])

  return (
    <div style={{ paddingBottom: 40 }}>
      <NavBar onBack={() => navigate(-1)}>Статистика</NavBar>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: period === p.key ? 'var(--color-primary)' : 'var(--color-bg)',
              color: period === p.key ? '#fff' : 'var(--color-text-secondary)',
              transition: 'background 0.15s, color 0.15s',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      ) : !stats || stats.meetings.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, marginTop: 60 }}>
          За цей період немає даних про відвідуваність
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>

          {/* Summary card */}
          <div style={card}>
            <div style={{ display: 'flex', gap: 0 }}>
              <SumStat label="Ср. відвід." value={`${stats.summary.avgAttendanceRate}%`} prev={`${stats.summary.prevAvgAttendanceRate}%`} change={stats.summary.avgAttendanceRate - stats.summary.prevAvgAttendanceRate} />
              <SumStat label="Нових" value={`${stats.summary.newMembers}`} prev={`${stats.summary.prevNewMembers}`} change={stats.summary.newMembers - stats.summary.prevNewMembers} />
              <SumStat label="Учасників" value={`${stats.summary.totalMembers}`} prev={`${stats.summary.prevTotalMembers}`} change={stats.summary.totalMembers - stats.summary.prevTotalMembers} />
            </div>
            <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--color-border-light)', marginTop: 4 }}>
              <SumStat label="Зустрічей" value={`${stats.summary.meetingCount}`} />
              <SumStat label="Гостей" value={`${stats.summary.totalGuests}`} />
            </div>
          </div>

          {/* Chart */}
          <div style={card}>
            <SectionLabel>Відвідуваність</SectionLabel>
            <AttendanceChart meetings={stats.meetings} />
          </div>

          {/* Person ranking */}
          <div style={card}>
            <SectionLabel>Рейтинг присутності</SectionLabel>
            {stats.personStats.map((p, i) => (
              <PersonRow key={p.personId} person={p} rank={i + 1} />
            ))}
          </div>

          {atRisk.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <SectionLabel>Під ризиком</SectionLabel>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>3+ пропуски поспіль</span>
              </div>
              {atRisk.map((m) => {
                const key = m.personId ? `p_${m.personId}` : `u_${m.userId}`
                const lastDate = m.lastAttendedDate
                  ? new Date(m.lastAttendedDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
                  : '—'
                return (
                  <div key={key}
                    onClick={() => navigate(m.personId ? `/people/${m.personId}` : `/admins/${m.userId}`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Останній раз: {lastDate}</div>
                    </div>
                    <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                      {m.missedCount} пропусків
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {statusDist && statusDist.totalPeople > 0 && (
            <div style={card}>
              <SectionLabel>Розподіл за статусом</SectionLabel>
              <MiniPieChart items={statusDist.items} total={statusDist.totalPeople} />
            </div>
          )}

          {/* Meeting list */}
          <div style={card}>
            <SectionLabel>Минулі зустрічі</SectionLabel>
            {[...stats.meetings].reverse().map((m) => (
              <MeetingRow key={m.date} meeting={m} />
            ))}
          </div>

        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function SumStat({ label, value, prev, change }: { label: string; value: string; prev?: string; change?: number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '10px 4px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
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

function MiniPieChart({ items, total }: { items: StatusDistributionResponse['items']; total: number }) {
  const size = 140, r = 60, cx = size / 2, cy = size / 2
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
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => <path key={i} d={arc(s.start, s.end)} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={30} fill="#fff" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--color-text)">{total}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill="var(--color-text-tertiary)">людей</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '14px 16px', marginTop: 16,
  boxShadow: 'var(--shadow-sm)',
}
