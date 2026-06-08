import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, Button, Dialog, Toast, SpinLoading } from 'antd-mobile'
import { AddOutline, EditSOutline, DeleteOutline } from 'antd-mobile-icons'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'

export function PersonStatusesPageMobile() {
  const navigate = useNavigate()
  const [statuses, setStatuses] = useState<PersonStatus[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    personStatusesApi.getAll()
      .then(setStatuses)
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (status: PersonStatus) => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити статус?',
      content: `"${status.name}" буде видалено. У людей з цим статусом він стане порожнім.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return

    try {
      await personStatusesApi.delete(status.id)
      setStatuses((prev) => prev.filter((s) => s.id !== status.id))
      Toast.show({ content: 'Статус видалено', icon: 'success' })
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
            onClick={() => navigate('/settings/person-statuses/new')}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
          >
            <AddOutline /> Новий
          </Button>
        }
      >
        Статуси людей
      </NavBar>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      ) : (
        <List style={{ marginTop: 12 }}>
          {statuses.length === 0 && (
            <List.Item>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Немає статусів</span>
            </List.Item>
          )}
          {statuses.map((status) => (
            <List.Item
              key={status.id}
              extra={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="mini"
                    fill="none"
                    onClick={() => navigate(`/settings/person-statuses/${status.id}`)}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <EditSOutline />
                  </Button>
                  <Button
                    size="mini"
                    fill="none"
                    onClick={() => handleDelete(status)}
                    style={{ color: 'var(--color-error)' }}
                  >
                    <DeleteOutline />
                  </Button>
                </div>
              }
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 20,
                  background: status.color + '22',
                  color: status.color,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {status.name}
              </span>
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}
