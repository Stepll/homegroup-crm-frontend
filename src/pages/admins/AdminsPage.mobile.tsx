import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, SearchBar, Button, Empty, SpinLoading } from 'antd-mobile'
import { adminsApi } from '@/api/admins'
import type { Admin } from '@/types'

export function AdminsPageMobile() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    adminsApi.getAll()
      .then(setAdmins)
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? admins.filter((a) => {
        const full = [a.name, a.lastName].filter(Boolean).join(' ').toLowerCase()
        return full.includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
      })
    : admins

  return (
    <div>
      <NavBar
        onBack={() => navigate(-1)}
        right={<Button size="small" color="primary" onClick={() => navigate('/settings/admins/new')}>+ Додати</Button>}
      >
        Адміни
      </NavBar>
      <div style={{ padding: '8px 16px' }}>
        <SearchBar placeholder="Пошук..." value={search} onChange={setSearch} />
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description="Адмінів не знайдено" style={{ marginTop: 48 }} />
      ) : (
        <List>
          {filtered.map((a) => (
            <List.Item
              key={a.id}
              extra={<AdminTags admin={a} />}
              onClick={() => navigate(`/settings/admins/${a.id}`)}
              arrow
            >
              {[a.name, a.lastName].filter(Boolean).join(' ')}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}

function AdminTags({ admin }: { admin: Admin }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 160 }}>
      {admin.roles.map((role) => (
        <span key={role.id} style={{ ...tag, color: role.color, background: `${role.color}18` }}>
          {role.name}
        </span>
      ))}
      {admin.primaryGroupName && (
        <span style={{ ...tag, color: admin.primaryGroupColor ?? 'var(--color-primary)', background: `${admin.primaryGroupColor ?? 'var(--color-primary)'}18` }}>
          {admin.primaryGroupName}
        </span>
      )}
    </div>
  )
}

const tag: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  borderRadius: 6, padding: '2px 7px',
  whiteSpace: 'nowrap',
}
