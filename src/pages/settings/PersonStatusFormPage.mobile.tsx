import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, Button, Toast, SpinLoading } from 'antd-mobile'
import { personStatusesApi } from '@/api/personStatuses'

const COLORS = [
  '#2AAFCA', '#10B981', '#6366F1', '#F59E0B',
  '#EF4444', '#F97316', '#EC4899', '#64748B',
  '#8B5CF6', '#06B6D4', '#84CC16', '#A855F7',
]

export function PersonStatusFormPageMobile() {
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
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ content: 'Назва обовʼязкова', icon: 'fail' })
      return
    }
    setSaving(true)
    try {
      if (isNew) await personStatusesApi.create({ name, color })
      else await personStatusesApi.update(Number(id), { name, color })
      Toast.show({ content: 'Збережено', icon: 'success' })
      navigate('/settings/person-statuses')
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar onBack={() => navigate(-1)}>
          {isNew ? 'Новий статус' : 'Редагування'}
        </NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <SpinLoading color="primary" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate(-1)}>
        {isNew ? 'Новий статус' : 'Редагування статусу'}
      </NavBar>

      <div style={{ padding: '0 12px' }}>

        <div style={sectionStyle}>
          <label style={labelStyle}>Назва<span style={requiredStyle}>*</span></label>
          <div style={inputWrap}>
            <Input
              placeholder="Наприклад: Активний, Новий, Гість"
              value={name}
              onChange={setName}
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Колір</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: c, border: 'none',
                  outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset: 2,
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        {name && (
          <div style={sectionStyle}>
            <label style={labelStyle}>Попередній перегляд</label>
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 14px',
                  borderRadius: 20,
                  background: color + '22',
                  color,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {name}
              </span>
            </div>
          </div>
        )}

        <Button
          block
          loading={saving}
          onClick={handleSave}
          style={{
            '--background-color': 'var(--color-primary)',
            '--border-color': 'var(--color-primary)',
            '--text-color': '#fff',
            '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600,
            marginTop: 24,
          } as React.CSSProperties}
        >
          {isNew ? 'Створити статус' : 'Зберегти зміни'}
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
const requiredStyle: React.CSSProperties = { color: '#EF4444', marginLeft: 4 }
