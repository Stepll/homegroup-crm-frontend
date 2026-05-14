import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, Button, Dialog, Toast, SpinLoading } from 'antd-mobile'
import { AddOutline, EditSOutline, DeleteOutline } from 'antd-mobile-icons'
import { roomsApi } from '@/api/calendar'
import type { Room } from '@/types'

const BUILDING_LABELS: Record<string, string> = {
  Church: 'Церква',
  SocialCenter: 'Соц. центр',
}

export function RoomsSettingsPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    roomsApi.getAll()
      .then(setRooms)
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (room: Room) => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити кімнату?',
      content: `"${room.name}" буде видалено.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await roomsApi.delete(room.id)
      setRooms((prev) => prev.filter((r) => r.id !== room.id))
      Toast.show({ content: 'Видалено', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  // Group by building → floor
  const grouped = rooms.reduce<Record<string, Record<number, Room[]>>>((acc, r) => {
    if (!acc[r.building]) acc[r.building] = {}
    if (!acc[r.building][r.floor]) acc[r.building][r.floor] = []
    acc[r.building][r.floor].push(r)
    return acc
  }, {})

  return (
    <div>
      <NavBar
        onBack={() => navigate('/settings')}
        right={
          <Button
            size="mini"
            onClick={() => navigate('/settings/rooms/new')}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
          >
            <AddOutline /> Нова
          </Button>
        }
      >
        Кімнати для бронювання
      </NavBar>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          Кімнат ще немає
        </div>
      ) : (
        (['Church', 'SocialCenter'] as const).filter((b) => grouped[b]).map((building) => (
          <div key={building}>
            <div style={{
              padding: '12px 16px 4px',
              fontSize: 12, fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {BUILDING_LABELS[building]}
            </div>
            {Object.entries(grouped[building])
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([floor, floorRooms]) => (
                <div key={floor}>
                  <div style={{
                    padding: '4px 16px',
                    fontSize: 11, color: 'var(--color-text-tertiary)',
                  }}>
                    Поверх {floor}
                  </div>
                  <List>
                    {floorRooms.map((room) => (
                      <List.Item
                        key={room.id}
                        prefix={
                          <span style={{
                            display: 'inline-block',
                            width: 12, height: 12, borderRadius: '50%',
                            background: room.color, flexShrink: 0,
                          }} />
                        }
                        extra={
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button size="mini" fill="none"
                              onClick={() => navigate(`/settings/rooms/${room.id}`)}
                              style={{ color: 'var(--color-primary)' }}>
                              <EditSOutline />
                            </Button>
                            <Button size="mini" fill="none"
                              onClick={() => handleDelete(room)}
                              style={{ color: 'var(--color-error)' }}>
                              <DeleteOutline />
                            </Button>
                          </div>
                        }
                      >
                        {room.name}
                      </List.Item>
                    ))}
                  </List>
                </div>
              ))}
          </div>
        ))
      )}
    </div>
  )
}
