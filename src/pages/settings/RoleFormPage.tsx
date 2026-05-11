import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Form, Input, TextArea, Switch, Button, Toast, SpinLoading, Checkbox } from 'antd-mobile'
import { rolesApi, type RoleFormData } from '@/api/roles'

const COLORS = [
  { value: '#2AAFCA', label: 'Teal' },
  { value: '#10B981', label: 'Зелений' },
  { value: '#6366F1', label: 'Індиго' },
  { value: '#F59E0B', label: 'Жовтий' },
  { value: '#EF4444', label: 'Червоний' },
  { value: '#F97316', label: 'Помаранч.' },
  { value: '#EC4899', label: 'Рожевий' },
  { value: '#64748B', label: 'Сірий' },
]

const PAGES = [
  { key: 'dashboard', label: 'Дашборд' },
  { key: 'people', label: 'Люди' },
  { key: 'groups', label: 'Групи' },
  { key: 'attendance', label: 'Відвідуваність' },
  { key: 'admins', label: 'Адміни' },
  { key: 'settings', label: 'Налаштування' },
]

const EMPTY: RoleFormData = { name: '', description: '', color: '#2AAFCA', permissions: [], isDefault: false }

export function RoleFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState<RoleFormData>(EMPTY)
  const [isSystem, setIsSystem] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return
    rolesApi.getById(Number(id))
      .then((r: import('@/api/roles').Role) => {
        setForm({ name: r.name, description: r.description ?? '', color: r.color, permissions: r.permissions, isDefault: r.isDefault })
        setIsSystem(r.isSystem)
      })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Toast.show({ content: 'Назва обовʼязкова', icon: 'fail' })
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await rolesApi.create(form)
      } else {
        await rolesApi.update(Number(id), form)
      }
      Toast.show({ content: 'Збережено', icon: 'success' })
      navigate('/settings/roles')
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar onBack={() => navigate('/settings/roles')}>{isNew ? 'Нова роль' : 'Редагування'}</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/settings/roles')}>
        {isNew ? 'Нова роль' : 'Редагування ролі'}
      </NavBar>

      {isSystem && (
        <div style={{
          margin: '12px 12px 0',
          padding: '10px 14px',
          background: 'var(--color-primary-bg)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-primary-dark)',
          fontSize: 13,
        }}>
          Системна роль — перегляд без можливості редагування
        </div>
      )}

      <Form layout="vertical" style={{ '--border-inner': 'none' } as React.CSSProperties}>

        {/* Name */}
        <Form.Item label="Назва" required>
          <Input
            placeholder="Назва ролі"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            disabled={isSystem}
          />
        </Form.Item>

        {/* Description */}
        <Form.Item label="Опис">
          <TextArea
            placeholder="Короткий опис ролі"
            rows={2}
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          />
        </Form.Item>

        {/* Color */}
        <Form.Item label="Колір">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '4px 0' }}>
            {COLORS.map(({ value }) => (
              <button
                key={value}
                onClick={() => setForm((f) => ({ ...f, color: value }))}
                style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  background: value,
                  border: form.color === value ? `3px solid ${value}` : '3px solid transparent',
                  outline: form.color === value ? `2px solid ${value}` : 'none',
                  outlineOffset: 2,
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </Form.Item>

        {/* Permissions */}
        <Form.Item label="Доступні сторінки">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {isSystem && form.permissions.includes('*') ? (
              <span style={{ color: 'var(--color-primary)', fontSize: 14 }}>Доступ до всіх сторінок</span>
            ) : (
              PAGES.map(({ key, label }) => (
                <Checkbox
                  key={key}
                  checked={form.permissions.includes(key)}
                  onChange={() => togglePermission(key)}
                  disabled={isSystem}
                  style={{ '--font-size': '15px' } as React.CSSProperties}
                >
                  {label}
                </Checkbox>
              ))
            )}
          </div>
        </Form.Item>

        {/* IsDefault */}
        <Form.Item label="За замовчуванням" help="Нові адміни отримають цю роль">
          <Switch
            checked={form.isDefault}
            onChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
            disabled={isSystem}
          />
        </Form.Item>

      </Form>

      <div style={{ padding: '0 12px' }}>
        <Button
          block
          loading={saving}
          onClick={handleSave}
          disabled={isSystem}
          style={{
            '--background-color': 'var(--color-primary)',
            '--border-color': 'var(--color-primary)',
            '--text-color': '#fff',
            '--border-radius': 'var(--radius-md)',
            height: 48,
            fontSize: 'var(--font-base)',
            fontWeight: 600,
          } as React.CSSProperties}
        >
          {isNew ? 'Створити роль' : 'Зберегти зміни'}
        </Button>
        {isSystem && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 12, marginTop: 8 }}>
            Системну роль не можна редагувати
          </p>
        )}
      </div>
    </div>
  )
}
