import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, SearchBar, Button, Empty, SpinLoading } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import type { GroupMember } from '@/types'

export function PeoplePage() {
  const navigate = useNavigate()
  const [people, setPeople] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdmins, setShowAdmins] = useState(true)
  const [myOversight, setMyOversight] = useState(false)

  useEffect(() => {
    setLoading(true)
    peopleApi.getAll(search || undefined, undefined, showAdmins && !myOversight, myOversight || undefined)
      .then(setPeople)
      .finally(() => setLoading(false))
  }, [search, showAdmins, myOversight])

  const handleItemClick = (m: GroupMember) => {
    if (m.isAdmin) navigate(`/admins/${m.userId}`)
    else navigate(`/people/${m.id}`)
  }

  return (
    <div>
      <NavBar back={null} right={<Button size="small" color="primary" onClick={() => navigate('/people/new')}>+ Додати</Button>}>
        Люди
      </NavBar>

      <div style={{ padding: '8px 16px 4px' }}>
        <SearchBar placeholder="Пошук..." value={search} onChange={setSearch} />
      </div>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
        <button
          onClick={() => { setShowAdmins((v) => !v); setMyOversight(false) }}
          style={{
            ...filterBtn,
            background: showAdmins && !myOversight ? 'var(--color-primary)' : 'var(--color-bg)',
            color: showAdmins && !myOversight ? '#fff' : 'var(--color-text-secondary)',
            border: `1.5px solid ${showAdmins && !myOversight ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}
        >
          Показати адмінів
        </button>
        <button
          onClick={() => { setMyOversight((v) => !v); if (!myOversight) setShowAdmins(false) }}
          style={{
            ...filterBtn,
            background: myOversight ? 'var(--color-primary)' : 'var(--color-bg)',
            color: myOversight ? '#fff' : 'var(--color-text-secondary)',
            border: `1.5px solid ${myOversight ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}
        >
          Під моєю опікою
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading />
        </div>
      ) : people.length === 0 ? (
        <Empty description="Людей не знайдено" style={{ marginTop: 48 }} />
      ) : (
        <List>
          {people.map((m) => {
            const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
            const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
            return (
              <List.Item
                key={key}
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.isAdmin && m.roleTag && (
                      <span style={{ ...tag, color: m.roleTag.color, background: `${m.roleTag.color}18` }}>
                        {m.roleTag.name}
                      </span>
                    )}
                    {m.primaryGroupName && (
                      <span style={{ ...tag, color: m.primaryGroupColor ?? 'var(--color-primary)', background: `${m.primaryGroupColor ?? 'var(--color-primary)'}18` }}>
                        {m.primaryGroupName}
                      </span>
                    )}
                  </div>
                }
                onClick={() => handleItemClick(m)}
                arrow
              >
                {fullName}
              </List.Item>
            )
          })}
        </List>
      )}
    </div>
  )
}

const tag: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, borderRadius: 6,
  padding: '2px 7px', whiteSpace: 'nowrap',
}

const filterBtn: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, borderRadius: 20,
  padding: '5px 14px', cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  transition: 'background 0.12s, color 0.12s',
}
