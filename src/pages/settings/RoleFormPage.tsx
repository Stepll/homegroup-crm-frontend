import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, TextArea, Switch, Button, Toast, SpinLoading, Checkbox } from 'antd-mobile'
import { rolesApi, type RoleFormData, type Role } from '@/api/roles'

const COLORS = [
  '#2AAFCA', '#10B981', '#6366F1', '#F59E0B',
  '#EF4444', '#F97316', '#EC4899', '#64748B',
]

interface PermGroup {
  label: string
  items: { key: string; label: string }[]
}

const PERMISSION_GROUPS: PermGroup[] = [
  {
    label: 'Сторінки',
    items: [
      { key: 'page.dashboard', label: 'Дашборд' },
      { key: 'page.people', label: 'Люди' },
      { key: 'page.cabinet', label: 'Кабінет домашки' },
      { key: 'page.calendar', label: 'Церковний календар' },
      { key: 'page.settings', label: 'Налаштування' },
    ],
  },
  {
    label: 'Люди',
    items: [
      { key: 'people.view', label: 'Переглядати список людей' },
      { key: 'people.viewSensitive', label: 'Бачити телефон, адресу, дату народження' },
      { key: 'people.create', label: 'Додавати нових людей' },
      { key: 'people.edit', label: 'Редагувати профілі' },
      { key: 'people.delete', label: 'Видаляти людей' },
      { key: 'people.customFields', label: 'Управляти кастомними полями' },
    ],
  },
  {
    label: 'Адміни',
    items: [
      { key: 'admins.viewProfiles', label: 'Переглядати профілі адмінів' },
      { key: 'admins.viewSensitive', label: 'Бачити телефон та Telegram адмінів' },
    ],
  },
  {
    label: 'Домашні групи',
    items: [
      { key: 'groups.members.manage', label: 'Додавати / видаляти / синхронізувати членів' },
      { key: 'groups.nextMeeting.manage', label: 'Змінювати / пропускати дату зустрічі' },
      { key: 'groups.events.manage', label: 'Додавати / видаляти події групи' },
      { key: 'groups.create', label: 'Створювати нові групи' },
      { key: 'groups.edit', label: 'Редагувати налаштування групи' },
      { key: 'groups.delete', label: 'Видаляти групи' },
    ],
  },
  {
    label: 'Відвідуваність',
    items: [
      { key: 'attendance.view', label: 'Переглядати відвідуваність' },
      { key: 'attendance.record', label: 'Відмічати відвідуваність' },
      { key: 'attendance.stats', label: 'Переглядати статистику' },
    ],
  },
  {
    label: 'Планування',
    items: [
      { key: 'planning.view', label: 'Переглядати плани зустрічей' },
      { key: 'planning.edit', label: 'Створювати / редагувати / видаляти плани' },
      { key: 'planning.sendToTelegram', label: 'Надсилати план в Telegram' },
      { key: 'planning.templates', label: 'Управляти шаблонами планів' },
    ],
  },
  {
    label: 'Календар',
    items: [
      { key: 'calendar.view', label: 'Переглядати церковний календар' },
      { key: 'calendar.events.manage', label: 'Створювати / редагувати / видаляти події' },
      { key: 'calendar.google.sync', label: 'Синхронізація з Google Calendar' },
    ],
  },
  {
    label: 'Налаштування',
    items: [
      { key: 'settings.admins', label: 'Управляти адмінами' },
      { key: 'settings.roles', label: 'Управляти ролями' },
      { key: 'settings.groups', label: 'Налаштування груп' },
      { key: 'settings.rooms', label: 'Управляти кімнатами' },
      { key: 'settings.statuses', label: 'Управляти статусами людей' },
    ],
  },
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
      .then((r: Role) => {
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
      if (isNew) await rolesApi.create(form)
      else await rolesApi.update(Number(id), form)
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

      <div style={{ padding: '0 12px' }}>

        {/* Name */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Назва</label>
          <div style={inputWrap}>
            <Input
              placeholder="Назва ролі"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              disabled={isSystem}
            />
          </div>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Опис</label>
          <div style={inputWrap}>
            <TextArea
              placeholder="Короткий опис ролі"
              rows={2}
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              disabled={isSystem}
            />
          </div>
        </div>

        {/* Color */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Колір</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => !isSystem && setForm((f) => ({ ...f, color }))}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: color, border: 'none',
                  outline: form.color === color ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: 2,
                  cursor: isSystem ? 'default' : 'pointer',
                  padding: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  opacity: isSystem ? 0.6 : 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* Permissions */}
        {isSystem && form.permissions.includes('*') ? (
          <div style={sectionStyle}>
            <label style={labelStyle}>Права доступу</label>
            <div style={{ ...inputWrap }}>
              <span style={{ color: 'var(--color-primary)', fontSize: 14 }}>Повний доступ до всього</span>
            </div>
          </div>
        ) : (
          PERMISSION_GROUPS.map((group) => (
            <div key={group.label} style={sectionStyle}>
              <label style={labelStyle}>{group.label}</label>
              <div style={{ ...inputWrap, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map(({ key, label }) => (
                  <Checkbox
                    key={key}
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePermission(key)}
                    disabled={isSystem}
                    style={{ '--font-size': '14px' } as React.CSSProperties}
                  >
                    {label}
                  </Checkbox>
                ))}
              </div>
            </div>
          ))
        )}

        {/* IsDefault */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...inputWrap }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>За замовчуванням</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>Нові адміни отримають цю роль</div>
            </div>
            <Switch
              checked={form.isDefault}
              onChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
              disabled={isSystem}
            />
          </div>
        </div>

        {/* Save */}
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
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600,
            marginTop: 24,
          } as React.CSSProperties}
        >
          {isNew ? 'Створити роль' : 'Зберегти зміни'}
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
