import { useEffect, useState } from 'react'
import { SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import type { Group, GroupStats } from '@/types'

type Period = '1m' | '3m' | '6m'

const PERIODS: { key: Period; label: string }[] = [
  { key: '1m', label: '1 міс' },
  { key: '3m', label: '3 міс' },
  { key: '6m', label: '6 міс' },
]

const ALL_KEY = '__all__'

// ── Chart ─────────────────────────────────────────────────────────────────────

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
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, minWidth: meetings.length * 36, paddingTop: 8 }}>
          {meetings.map((m) => {
            const total = m.presentCount + m.guestCount
            const fullH = Math.max(Math.round((total / maxVal) * CHART_H), total > 0 ? 3 : 0)
            const guestH = total > 0 ? Math.round((m.guestCount / total) * fullH) : 0
            const memberH = fullH - guestH
            return (
              <div key={m.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 30px' }}>
                <div style={{ width: 20, display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden' }}>
                  {guestH > 0 && <div style={{ height: guestH, background: '#F97316' }} />}
                  {memberH > 0 && <div style={{ height: memberH, background: 'var(--color-primary)' }} />}
                  {fullH === 0 && <div style={{ height: 3, background: 'var(--color-border-light)', borderRadius: 4 }} />}
                </div>
                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 4, whiteSpace: 'nowrap' }}>
                  {fmtLabel(m.date)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
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

// ── Widget ────────────────────────────────────────────────────────────────────

export function GroupStatsWidget() {
  const [period, setPeriod] = useState<Period>('3m')
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY)
  const [groups, setGroups] = useState<Group[]>([])
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    groupsApi.getAll()
      .then(setGroups)
      .finally(() => setLoadingGroups(false))
  }, [])

  useEffect(() => {
    setLoadingStats(true)
    const req = selectedKey === ALL_KEY
      ? groupsApi.getStatsAll(period)
      : groupsApi.getStats(Number(selectedKey), period)
    req.then(setStats).finally(() => setLoadingStats(false))
  }, [selectedKey, period])

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={card}>
        {/* Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            disabled={loadingGroups}
            style={{
              flex: 1, minWidth: 0, border: '1.5px solid var(--color-border)', borderRadius: 8,
              padding: '7px 10px', fontSize: 14, background: 'var(--color-bg)',
              color: 'var(--color-text)', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value={ALL_KEY}>Всі домашки</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '7px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: period === p.key ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: period === p.key ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loadingStats ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <SpinLoading color="primary" />
          </div>
        ) : !stats || stats.meetings.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, padding: '16px 0' }}>
            За цей період немає даних про відвідуваність
          </div>
        ) : (
          <AttendanceChart meetings={stats.meetings} />
        )}
      </div>

    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  marginTop: 12,
  boxShadow: 'var(--shadow-sm)',
}
