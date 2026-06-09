import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import { useAuth } from '@/store/auth'
import type { Group, AllNeed } from '@/types'

const ALL_KEY = '__all__'

export function RandomNeedWidget() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('groups.events.manage')

  const [groups, setGroups] = useState<Group[]>([])
  const [pool, setPool] = useState<AllNeed[]>([])
  const [current, setCurrent] = useState<AllNeed | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {})
  }, [])

  const pickRandom = useCallback((p: AllNeed[]) => {
    if (p.length === 0) { setCurrent(null); return }
    setCurrent(p[Math.floor(Math.random() * p.length)])
  }, [])

  useEffect(() => {
    setLoading(true)
    const gid = selectedKey === ALL_KEY ? undefined : Number(selectedKey)
    groupsApi.getAllNeeds(gid)
      .then((data) => { setPool(data); pickRandom(data) })
      .catch(() => { setPool([]); setCurrent(null) })
      .finally(() => setLoading(false))
  }, [selectedKey, pickRandom])

  async function changeStatus(status: 'answered' | 'irrelevant') {
    if (!current) return
    setSaving(true)
    try {
      await groupsApi.updateNeed(current.homeGroupId, current.id, {
        subjectName: current.subjectName,
        description: current.description,
        status,
        personId: current.personId,
        userId: current.userId,
      })
      const newPool = pool.filter(n => n.id !== current.id)
      setPool(newPool)
      pickRandom(newPool)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <div style={widgetWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={sectionLabel}>Молитовна потреба</div>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          style={selectStyle}
        >
          <option value={ALL_KEY}>Всі домашки</option>
          {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <SpinLoading color="primary" style={{ '--size': '20px' } as React.CSSProperties} />
        </div>
      ) : !current ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '12px 0' }}>
          Немає активних потреб
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {(current.personId || current.userId) ? (
              <span
                onClick={() => navigate(current.personId ? `/people/${current.personId}` : `/admins/${current.userId}`)}
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}
              >
                {current.subjectName}
              </span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{current.subjectName}</span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
              background: `${current.groupColor}22`, color: current.groupColor,
            }}>
              {current.groupName}
            </span>
          </div>

          <div style={{
            fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5,
            padding: '10px 12px', background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)', marginBottom: 12,
          }}>
            {current.description}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {canEdit && (
              <>
                <button onClick={() => changeStatus('answered')} disabled={saving} style={answeredBtn}>✓ Відповіли</button>
                <button onClick={() => changeStatus('irrelevant')} disabled={saving} style={irrelevantBtn}>✕ Не актуальна</button>
              </>
            )}
            <button
              onClick={() => pickRandom(pool)}
              disabled={saving || pool.length <= 1}
              style={{ ...newBtn, marginLeft: canEdit ? 'auto' : 0 }}
            >
              ↺ Нова
            </button>
          </div>
        </>
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

const btnBase: React.CSSProperties = {
  border: 'none', borderRadius: 8, padding: '7px 12px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

const answeredBtn: React.CSSProperties = { ...btnBase, background: '#F0FDF4', color: '#16A34A' }
const irrelevantBtn: React.CSSProperties = { ...btnBase, background: '#F9FAFB', color: 'var(--color-text-tertiary)' }
const newBtn: React.CSSProperties = { ...btnBase, background: 'var(--color-bg)', color: 'var(--color-text-secondary)', border: '1.5px solid var(--color-border)' }
