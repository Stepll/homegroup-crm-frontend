import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Spin, Typography, Space, Modal, Segmented } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { roomsApi } from '@/api/calendar'

const { Title } = Typography

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

export function RoomFormPageDesktop() {
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
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const handleSave = async () => {
    if (!name.trim()) { Modal.error({ title: "Назва обов'язкова" }); return }
    setSaving(true)
    try {
      const payload = { name: name.trim(), building, floor, color }
      if (isNew) await roomsApi.create(payload)
      else await roomsApi.update(Number(id), payload)
      navigate('/settings/rooms')
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings/rooms')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{isNew ? 'Нова кімната' : 'Редагування кімнати'}</Title>
      </Space>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Назва<span style={requiredStyle}>*</span></div>
          <Input
            placeholder="Наприклад: Зала А, Конференц-зал"
            value={name} onChange={(e) => setName(e.target.value)} size="large"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Приміщення</div>
          <Segmented
            block
            value={building}
            onChange={(v) => setBuilding(v as string)}
            options={BUILDINGS.map((b) => ({ label: b.label, value: b.value }))}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Поверх</div>
          <Segmented
            block
            value={floor}
            onChange={(v) => setFloor(Number(v))}
            options={FLOORS.map((f) => ({ label: String(f), value: f }))}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Колір</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: c, border: 'none',
                  outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2, cursor: 'pointer', padding: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        {name && (
          <div style={{ marginBottom: 20 }}>
            <div style={labelStyle}>Попередній перегляд</div>
            <Space>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                · {BUILDINGS.find((b) => b.value === building)?.label}, поверх {floor}
              </span>
            </Space>
          </div>
        )}

        <Button
          type="primary" loading={saving} onClick={handleSave}
          size="large" style={{ width: '100%', fontWeight: 600 }}
        >
          {isNew ? 'Створити кімнату' : 'Зберегти зміни'}
        </Button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
}
const requiredStyle: React.CSSProperties = { color: '#EF4444', marginLeft: 4 }
