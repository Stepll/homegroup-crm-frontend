import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Checkbox, Typography, Space, Spin } from 'antd'
import { ArrowLeftOutlined, HolderOutlined } from '@ant-design/icons'
import { adminsApi } from '@/api/admins'
import { ALL_WIDGETS, mergeWithDefaults, defaultConfig } from './widgetRegistry'

const { Title, Text } = Typography

export function DashboardSettingsPageDesktop() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [enabledOrder, setEnabledOrder] = useState<string[]>([])
  const [enabledSet, setEnabledSet] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    adminsApi.getDashboardConfig()
      .then((saved) => {
        const config = saved.length > 0 ? mergeWithDefaults(saved) : defaultConfig()
        setEnabledOrder(config.filter((w) => w.enabled).map((w) => w.id))
        setEnabledSet(new Set(config.filter((w) => w.enabled).map((w) => w.id)))
      })
      .catch(() => {
        const config = defaultConfig()
        setEnabledOrder(config.map((w) => w.id))
        setEnabledSet(new Set(config.map((w) => w.id)))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const config = [
      ...enabledOrder.map((id) => ({ id, enabled: true })),
      ...ALL_WIDGETS.filter((w) => !enabledSet.has(w.id)).map((w) => ({ id: w.id, enabled: false })),
    ]
    try {
      await adminsApi.saveDashboardConfig(config)
      navigate(-1)
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const toggleWidget = (id: string) => {
    setEnabledSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setEnabledOrder((o) => o.filter((x) => x !== id))
      } else {
        next.add(id)
        setEnabledOrder((o) => [...o, id])
      }
      return next
    })
  }

  const handleDragStart = (id: string) => setDragId(id)
  const handleDragEnter = (id: string) => {
    if (!dragId || dragId === id) return
    setDragOverId(id)
    setEnabledOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(dragId)
      const toIdx = next.indexOf(id)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragId)
      return next
    })
  }
  const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

  const widgetLabel = (id: string) => ALL_WIDGETS.find((w) => w.id === id)?.label ?? id

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
          <Title level={3} style={{ margin: 0 }}>Блоки дашборду</Title>
        </Space>
        <Button type="primary" loading={saving} onClick={handleSave}>Зберегти</Button>
      </div>

      <Card title="Порядок блоків" style={{ marginBottom: 16 }}>
        {enabledOrder.length === 0 ? (
          <Text type="secondary">Жодного блоку не вибрано</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {enabledOrder.map((id) => (
              <div
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragEnter={() => handleDragEnter(id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 6,
                  background: dragOverId === id ? '#f0f9ff' : '#fafafa',
                  border: `1px solid ${dragId === id ? '#2AAFCA' : 'rgba(0,0,0,0.08)'}`,
                  opacity: dragId === id ? 0.5 : 1, cursor: 'grab',
                }}
              >
                <HolderOutlined style={{ color: 'rgba(0,0,0,0.25)', fontSize: 16 }} />
                <Text style={{ flex: 1, fontWeight: 500 }}>{widgetLabel(id)}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Всі блоки">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ALL_WIDGETS.map((w) => {
            const checked = enabledSet.has(w.id)
            return (
              <div
                key={w.id}
                onClick={() => toggleWidget(w.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                  background: checked ? 'rgba(42,175,202,0.05)' : undefined,
                  border: `1px solid ${checked ? 'rgba(42,175,202,0.25)' : 'transparent'}`,
                }}
              >
                <Checkbox checked={checked} onChange={() => toggleWidget(w.id)} onClick={(e) => e.stopPropagation()} />
                <div>
                  <Text style={{ fontWeight: 500 }}>{w.label}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{w.description}</Text>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
