import { useEffect, useMemo, useState } from 'react'
import { SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import { dashboardApi, type GroupComparisonSeries, type ComparisonPeriod } from '@/api/dashboard'
import type { Group } from '@/types'

const PERIODS: { key: ComparisonPeriod; label: string }[] = [
  { key: '1m', label: '1 міс' },
  { key: '3m', label: '3 міс' },
  { key: '6m', label: '6 міс' },
]

// Color palette for series — used when group has no own color (rare)
const FALLBACK_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

export function GroupsComparisonWidget() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [period, setPeriod] = useState<ComparisonPeriod>('3m')
  const [series, setSeries] = useState<GroupComparisonSeries[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then((gs) => {
      setGroups(gs)
      // Default: select first 3 groups
      setSelectedIds(new Set(gs.slice(0, 3).map((g) => g.id)))
    })
  }, [])

  useEffect(() => {
    if (selectedIds.size === 0) { setSeries([]); setLoading(false); return }
    setLoading(true)
    dashboardApi.groupsComparison([...selectedIds], period)
      .then(setSeries)
      .catch(() => setSeries([]))
      .finally(() => setLoading(false))
  }, [selectedIds, period])

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div style={widgetWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={sectionLabel}>Порівняння домашок</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: period === p.key ? 'var(--color-primary)' : 'var(--color-bg)',
                color: period === p.key ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group multi-select chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {groups.map((g) => {
          const active = selectedIds.has(g.id)
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              style={{
                padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${active ? g.color : 'var(--color-border)'}`,
                background: active ? `${g.color}1a` : 'transparent',
                color: active ? g.color : 'var(--color-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {g.name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <SpinLoading color="primary" />
        </div>
      ) : series.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '16px 0' }}>
          Виберіть домашки для порівняння
        </div>
      ) : (
        <ComparisonChart series={series} />
      )}
    </div>
  )
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function ComparisonChart({ series }: { series: GroupComparisonSeries[] }) {
  const W = 600
  const H = 200
  const PAD = { top: 10, right: 12, bottom: 24, left: 32 }

  // Collect all sorted unique dates across all series
  const allDates = useMemo(() => {
    const set = new Set<string>()
    series.forEach((s) => s.points.forEach((p) => set.add(p.date)))
    return [...set].sort()
  }, [series])

  if (allDates.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '16px 0' }}>
        За цей період немає даних
      </div>
    )
  }

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const xStep = allDates.length > 1 ? innerW / (allDates.length - 1) : 0

  const xFor = (date: string) => {
    const idx = allDates.indexOf(date)
    return PAD.left + (allDates.length === 1 ? innerW / 2 : idx * xStep)
  }
  const yFor = (rate: number) => PAD.top + innerH - (rate / 100) * innerH

  // Y-axis labels
  const yTicks = [0, 25, 50, 75, 100]

  // X-axis labels: thin out if too many dates
  const maxLabels = 7
  const labelStep = Math.max(1, Math.ceil(allDates.length / maxLabels))

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 280, height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
          {/* Grid + Y labels */}
          {yTicks.map((tick) => {
            const y = yFor(tick)
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--color-border-light)" strokeDasharray={tick === 0 ? '0' : '2 3'} strokeWidth={1} />
                <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-text-tertiary)">{tick}%</text>
              </g>
            )
          })}

          {/* X labels */}
          {allDates.map((d, i) => {
            if (i % labelStep !== 0 && i !== allDates.length - 1) return null
            return (
              <text key={d} x={xFor(d)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--color-text-tertiary)">
                {formatDate(d)}
              </text>
            )
          })}

          {/* Series lines */}
          {series.map((s, idx) => {
            const color = s.groupColor || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
            const sorted = [...s.points].sort((a, b) => a.date.localeCompare(b.date))
            if (sorted.length === 0) return null
            const pathD = sorted
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.date)} ${yFor(p.attendanceRate)}`)
              .join(' ')
            return (
              <g key={s.groupId}>
                <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {sorted.map((p) => (
                  <circle key={p.date} cx={xFor(p.date)} cy={yFor(p.attendanceRate)} r={3} fill={color} />
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {series.map((s, idx) => {
          const color = s.groupColor || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
          return (
            <div key={s.groupId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 3, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.groupName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

const widgetWrap: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  marginBottom: 12,
  boxShadow: 'var(--shadow-sm)',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
