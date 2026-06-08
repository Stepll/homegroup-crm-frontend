import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import { dashboardApi, type InactiveMember } from '@/api/dashboard'
import type { Group } from '@/types'

const ALL_KEY = '__all__'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function InactiveMembersWidget() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY)
  const [members, setMembers] = useState<InactiveMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const gid = selectedKey === ALL_KEY ? undefined : Number(selectedKey)
    dashboardApi.inactiveMembers(gid)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [selectedKey])

  const handleClick = (m: InactiveMember) => {
    if (m.personId) navigate(`/people/${m.personId}`)
    else if (m.userId) navigate(`/admins/${m.userId}`)
  }

  return (
    <div style={widgetWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={sectionLabel}>Давно не ходять</div>
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <SpinLoading color="primary" style={{ '--size': '20px' } as React.CSSProperties} />
        </div>
      ) : members.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 0', textAlign: 'center' }}>
          Немає людей з 5+ пропусками
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 320, overflowY: 'auto' }}>
          {members.map((m) => {
            const key = m.personId ? `p_${m.personId}` : `u_${m.userId}`
            return (
              <div
                key={key}
                onClick={() => handleClick(m)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 4px', borderBottom: '1px solid var(--color-border-light)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.fullName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1, display: 'flex', gap: 6 }}>
                    {m.groupName && (
                      <span style={{
                        background: `${m.groupColor ?? '#9CA3AF'}20`,
                        color: m.groupColor ?? '#6B7280',
                        padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                      }}>
                        {m.groupName}
                      </span>
                    )}
                    <span>Останній раз: {formatDate(m.lastAttendedDate)}</span>
                  </span>
                </div>
                <div style={{
                  marginLeft: 8, flexShrink: 0,
                  background: 'var(--color-error)', color: '#fff',
                  borderRadius: 12, padding: '2px 9px',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {m.missedCount}
                </div>
              </div>
            )
          })}
        </div>
      )}
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
