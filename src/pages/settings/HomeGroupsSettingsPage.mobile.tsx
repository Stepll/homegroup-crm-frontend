import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, Button, Dialog, Toast, SpinLoading } from 'antd-mobile'
import { AddOutline, EditSOutline, DeleteOutline } from 'antd-mobile-icons'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

export function HomeGroupsSettingsPageMobile() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    groupsApi.getAll()
      .then(setGroups)
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (group: Group) => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити групу?',
      content: `"${group.name}" буде видалено назавжди разом з усіма учасниками.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return

    try {
      await groupsApi.delete(group.id)
      setGroups((prev) => prev.filter((g) => g.id !== group.id))
      Toast.show({ content: 'Групу видалено', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  return (
    <div>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <Button
            size="mini"
            onClick={() => navigate('/settings/home-groups/new')}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
          >
            <AddOutline /> Нова
          </Button>
        }
      >
        Домашні групи
      </NavBar>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      ) : (
        <List style={{ marginTop: 12 }}>
          {groups.map((group) => (
            <List.Item
              key={group.id}
              description={
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                  {group.memberCount} учасників
                  {group.description ? ` · ${group.description}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="mini"
                    fill="none"
                    onClick={() => navigate(`/settings/home-groups/${group.id}`)}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <EditSOutline />
                  </Button>
                  <Button
                    size="mini"
                    fill="none"
                    onClick={() => handleDelete(group)}
                    style={{ color: 'var(--color-error)' }}
                  >
                    <DeleteOutline />
                  </Button>
                </div>
              }
            >
              <span style={{ color: group.color, fontWeight: 600 }}>{group.name}</span>
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}
