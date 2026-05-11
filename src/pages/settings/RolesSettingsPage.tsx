import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, Button, Dialog, Toast, SpinLoading } from 'antd-mobile'
import { AddOutline, EditSOutline, DeleteOutline } from 'antd-mobile-icons'
import { rolesApi, type Role } from '@/api/roles'

export function RolesSettingsPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    rolesApi.getAll()
      .then(setRoles)
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (role: Role) => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити роль?',
      content: `"${role.name}" буде видалено назавжди.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return

    try {
      await rolesApi.delete(role.id)
      setRoles((prev) => prev.filter((r) => r.id !== role.id))
      Toast.show({ content: 'Роль видалено', icon: 'success' })
    } catch {
      Toast.show({ content: 'Неможливо видалити роль', icon: 'fail' })
    }
  }

  return (
    <div>
      <NavBar
        onBack={() => navigate('/settings')}
        right={
          <Button
            size="mini"
            onClick={() => navigate('/settings/roles/new')}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
          >
            <AddOutline /> Нова
          </Button>
        }
      >
        Ролі
      </NavBar>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      ) : (
        <List style={{ marginTop: 12 }}>
          {roles.map((role) => (
            <List.Item
              key={role.id}
              description={
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                  {role.userCount} користувачів
                  {role.description ? ` · ${role.description}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="mini"
                    fill="none"
                    onClick={() => navigate(`/settings/roles/${role.id}`)}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <EditSOutline />
                  </Button>
                  {!role.isSystem && (
                    <Button
                      size="mini"
                      fill="none"
                      onClick={() => handleDelete(role)}
                      style={{ color: 'var(--color-error)' }}
                    >
                      <DeleteOutline />
                    </Button>
                  )}
                </div>
              }
            >
              <span style={{ color: role.color, fontWeight: 600 }}>{role.name}</span>
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}
