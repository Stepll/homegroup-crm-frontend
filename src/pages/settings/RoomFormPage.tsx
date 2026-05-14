import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, Button, Toast, SpinLoading } from 'antd-mobile'
import { roomsApi } from '@/api/calendar'

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#10B981', '#14B8A6', '#2AAFCA', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6B7280', '#1F2937',
]

const BUILDINGS = [
  { value: 'Church', label: 'Церква' },
  { value: 'SocialCenter', label: 'Соц. центр' },
]

const FLOORS = [1, 2, 3, 4]

export function RoomFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [building, setBuilding] = useState('Church')
  const [floor, setFloor] = useState(1)
  const [color, setColor] = useState('#3B82F6')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return
    roomsApi.getById(Number(id))
      .then((r) => { setName(r.name); setBuilding(r.building); setFloor(r.floor); setColor(r.color) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const handleSave = async () => {
    if (!name.trim()) { Toast.show({ content: "Назва обов'язкова", icon: 'fail' }); return }
    setSaving(true)
    try {
      const payload = { name: name.trim(), building, floor, color }
      if (isNew) await roomsApi.create(payload)
      else await roomsApi.update(Number(id), payload)
      Toast.show({ content: 'Збережено', icon: 'success' })
      navigate('/settings/rooms')
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar onBack={() => navigate('/settings/rooms')}>Кімната</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/settings/rooms')}>
        {isNew ? 'Нова кімната' : 'Редагування кімнати'}
      </NavBar>

      <div style={{ padding: '0 12px' }}>

        <div style={sectionStyle}>
          <label style={labelStyle}>Назва</label>
          <div style={inputWrap}>
            <Input placeholder="Наприклад: Зала А, Конференц-зал" value={name} onChange={setName} />
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Приміщення</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {BUILDINGS.map((b) => (
              <button key={b.value} onClick={() => setBuilding(b.value)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                border: `1.5px solid ${building === b.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: building === b.value ? 'var(--color-primary-bg)' : 'transparent',
                color: building === b.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Поверх</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {FLOORS.map((f) => (
              <button key={f} onClick={() => setFloor(f)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 16, fontWeight: 700,
                border: `1.5px solid ${floor === f ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: floor === f ? 'var(--color-primary-bg)' : 'transparent',
                color: floor === f ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Колір</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 36, height: 36, borderRadius: '50%', background: c, border: 'none',
                outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                outlineOffset: 2, cursor: 'pointer', padding: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }} />
            ))}
          </div>
        </div>

        {name && (
          <div style={sectionStyle}>
            <label style={labelStyle}>Попередній перегляд</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                · {BUILDINGS.find((b) => b.value === building)?.label}, поверх {floor}
              </span>
            </div>
          </div>
        )}

        <Button
          block loading={saving} onClick={handleSave}
          style={{
            '--background-color': 'var(--color-primary)', '--border-color': 'var(--color-primary)',
            '--text-color': '#fff', '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 24,
          } as React.CSSProperties}
        >
          {isNew ? 'Створити кімнату' : 'Зберегти зміни'}
        </Button>
      </div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = { marginTop: 20 }
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--color-text-secondary)', marginBottom: 8,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const inputWrap: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '10px 14px',
}
