import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, SearchBar, Button, Empty, SpinLoading } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import type { Person } from '@/types'

export function PeoplePage() {
  const navigate = useNavigate()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    peopleApi.getAll(search || undefined)
      .then(setPeople)
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div>
      <NavBar back={null} right={<Button size="small" color="primary" onClick={() => navigate('/people/new')}>+ Додати</Button>}>
        Люди
      </NavBar>
      <div style={{ padding: '8px 16px' }}>
        <SearchBar placeholder="Пошук..." value={search} onChange={setSearch} />
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading />
        </div>
      ) : people.length === 0 ? (
        <Empty description="Людей не знайдено" style={{ marginTop: 48 }} />
      ) : (
        <List>
          {people.map((p) => (
            <List.Item
              key={p.id}
              extra={p.primaryGroupName
                ? <span style={groupTag}>{p.primaryGroupName}</span>
                : null}
              onClick={() => navigate(`/people/${p.id}`)}
              arrow
            >
              {[p.name, p.lastName].filter(Boolean).join(' ')}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}

const groupTag: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--color-primary)',
  background: 'rgba(42,175,202,0.1)',
  borderRadius: 6, padding: '2px 7px',
  whiteSpace: 'nowrap',
}
