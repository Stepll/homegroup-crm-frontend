import { useEffect, useState } from 'react'
import { SpinLoading } from 'antd-mobile'
import { dashboardApi, type GroupsAttendanceSummaryResponse } from '@/api/dashboard'

export function GroupsAttendanceSummaryWidget() {
  const [data, setData] = useState<GroupsAttendanceSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.groupsAttendanceSummary()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={widgetWrap}>
      <div style={sectionLabel}>Відвідуваність по домашках</div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <SpinLoading color="primary" />
        </div>
      ) : !data || data.groups.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '16px 0' }}>
          Немає домашок
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', minWidth: 360, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
                <th style={{ ...thStyle, textAlign: 'left' }}>Домашка</th>
                <th style={thStyle}>Людей</th>
                <th style={thStyle}>1 міс</th>
                <th style={thStyle}>3 міс</th>
                <th style={thStyle}>6 міс</th>
              </tr>
            </thead>
            <tbody>
              {data.groups.map((g) => (
                <tr key={g.groupId} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.groupColor, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.groupName}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{g.totalMembers}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{formatPct(g.avg1m)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{formatPct(g.avg3m)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{formatPct(g.avg6m)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--color-border)', background: '#FAFAFB' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>Всього</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{data.totalMembers}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{formatPct(data.avg1m)}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{formatPct(data.avg3m)}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{formatPct(data.avg6m)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatPct(v: number) {
  if (v === 0) return <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
  const color = v >= 70 ? 'var(--color-success)' : v >= 50 ? 'var(--color-warning, #F59E0B)' : 'var(--color-error)'
  return <span style={{ color }}>{Math.round(v)}%</span>
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
  marginBottom: 4,
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'center',
  fontSize: 11, fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

const tdStyle: React.CSSProperties = {
  padding: '10px', color: 'var(--color-text)',
}
