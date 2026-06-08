import { useEffect, useState } from 'react'
import { SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import { dashboardApi, type StatusDistributionResponse } from '@/api/dashboard'
import type { Group } from '@/types'

const ALL_KEY = '__all__'

export function StatusDistributionWidget() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY)
  const [data, setData] = useState<StatusDistributionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const gid = selectedKey === ALL_KEY ? undefined : Number(selectedKey)
    dashboardApi.statusDistribution(gid)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedKey])

  return (
    <div style={widgetWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={sectionLabel}>Розподіл за статусом</div>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          style={selectStyle}
        >
          <option value={ALL_KEY}>Всі домашки</option>
          {groups.map((g) => (
            <option key={g.id} value={String(g.id)}>{g.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <SpinLoading color="primary" />
        </div>
      ) : !data || data.totalPeople === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '16px 0' }}>
          Немає людей у вибраному діапазоні
        </div>
      ) : (
        <PieChart items={data.items} total={data.totalPeople} />
      )}
    </div>
  )
}

interface Item { statusId: number | null; name: string; color: string; count: number }

function PieChart({ items, total }: { items: Item[]; total: number }) {
  const size = 160
  const r = 70
  const cx = size / 2
  const cy = size / 2

  // Build arc segments
  let cumulative = 0
  const segments = items.map((it) => {
    const pct = it.count / total
    const startAngle = cumulative * 2 * Math.PI
    cumulative += pct
    const endAngle = cumulative * 2 * Math.PI
    return { ...it, pct, startAngle, endAngle }
  })

  const arcPath = (startAngle: number, endAngle: number) => {
    // Single segment case (100%) — draw two semicircles via M..A..A
    if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
    }
    const x1 = cx + r * Math.sin(startAngle)
    const y1 = cy - r * Math.cos(startAngle)
    const x2 = cx + r * Math.sin(endAngle)
    const y2 = cy - r * Math.cos(endAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => (
          <path key={i} d={arcPath(s.startAngle, s.endAngle)} fill={s.color} />
        ))}
        {/* Donut hole */}
        <circle cx={cx} cy={cy} r={36} fill="#fff" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--color-text)">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="var(--color-text-tertiary)">людей</text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: it.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              {it.count} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>· {Math.round(it.count * 100 / total)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
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

const selectStyle: React.CSSProperties = {
  border: '1.5px solid var(--color-border)', borderRadius: 8,
  padding: '5px 8px', fontSize: 12, background: 'var(--color-bg)',
  color: 'var(--color-text)', outline: 'none', cursor: 'pointer',
  maxWidth: 160,
}
