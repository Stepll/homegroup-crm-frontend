import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Spin, Typography, Space, Modal } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { personStatusesApi } from '@/api/personStatuses'

const { Title } = Typography

const COLORS = [
  '#2AAFCA', '#10B981', '#6366F1', '#F59E0B',
  '#EF4444', '#F97316', '#EC4899', '#64748B',
  '#8B5CF6', '#06B6D4', '#84CC16', '#A855F7',
]

export function PersonStatusFormPageDesktop() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#10B981')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return
    personStatusesApi.getAll()
      .then((statuses) => {
        const found = statuses.find((s) => s.id === Number(id))
        if (found) { setName(found.name); setColor(found.color) }
      })
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const handleSave = async () => {
    if (!name.trim()) { Modal.error({ title: "Назва обов'язкова" }); return }
    setSaving(true)
    try {
      if (isNew) await personStatusesApi.create({ name, color })
      else await personStatusesApi.update(Number(id), { name, color })
      navigate('/settings/person-statuses')
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings/person-statuses')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{isNew ? 'Новий статус' : 'Редагування статусу'}</Title>
      </Space>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Назва<span style={requiredStyle}>*</span></div>
          <Input
            placeholder="Наприклад: Активний, Новий, Гість"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="large"
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
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 20,
              background: color + '22', color, fontWeight: 600, fontSize: 14,
            }}>
              {name}
            </span>
          </div>
        )}

        <Button
          type="primary" loading={saving} onClick={handleSave}
          size="large" style={{ width: '100%', fontWeight: 600 }}
        >
          {isNew ? 'Створити статус' : 'Зберегти зміни'}
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
