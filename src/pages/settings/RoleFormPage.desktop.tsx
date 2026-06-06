import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Spin, Typography, Space, Modal, Switch, Checkbox, Alert, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { rolesApi, type RoleFormData, type Role } from '@/api/roles'

const { Title } = Typography

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
      { key: 'groups.schedule.manage', label: 'Налаштування графіку (переноси / скасування за тижнями)' },
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

export function RoleFormPageDesktop() {
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
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
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
    if (!form.name.trim()) { Modal.error({ title: "Назва обов'язкова" }); return }
    setSaving(true)
    try {
      if (isNew) await rolesApi.create(form)
      else await rolesApi.update(Number(id), form)
      navigate('/settings/roles')
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings/roles')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{isNew ? 'Нова роль' : 'Редагування ролі'}</Title>
      </Space>

      {isSystem && (
        <Alert
          message="Системна роль — перегляд без можливості редагування"
          type="info" showIcon style={{ marginBottom: 20 }}
        />
      )}

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <Row gutter={[20, 20]}>
          <Col span={14}>
            <div style={labelStyle}>Назва<span style={requiredStyle}>*</span></div>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Назва ролі" size="large" disabled={isSystem}
            />
          </Col>
          <Col span={10}>
            <div style={labelStyle}>Колір</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => !isSystem && setForm((f) => ({ ...f, color }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: color, border: 'none',
                    outline: form.color === color ? `3px solid ${color}` : '3px solid transparent',
                    outlineOffset: 2, cursor: isSystem ? 'default' : 'pointer', padding: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)', opacity: isSystem ? 0.6 : 1,
                  }}
                />
              ))}
            </div>
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Опис</div>
          <Input.TextArea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Короткий опис ролі" rows={2} disabled={isSystem}
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={labelStyle}>Права доступу</div>
          {isSystem && form.permissions.includes('*') ? (
            <div style={{ padding: '10px 14px', background: 'rgba(42,175,202,0.08)', borderRadius: 8, color: 'var(--color-primary)', fontWeight: 600 }}>
              Повний доступ до всього
            </div>
          ) : (
            <Row gutter={[16, 0]}>
              {PERMISSION_GROUPS.map((group) => (
                <Col key={group.label} xs={24} md={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      {group.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {group.items.map(({ key, label }) => (
                        <Checkbox
                          key={key}
                          checked={form.permissions.includes(key)}
                          onChange={() => togglePermission(key)}
                          disabled={isSystem}
                        >
                          <span style={{ fontSize: 13 }}>{label}</span>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>За замовчуванням</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>Нові адміни отримають цю роль</div>
          </div>
          <Switch checked={form.isDefault} onChange={(v) => setForm((f) => ({ ...f, isDefault: v }))} disabled={isSystem} />
        </div>

        <Button
          type="primary" loading={saving} onClick={handleSave}
          size="large" style={{ width: '100%', fontWeight: 600, marginTop: 24 }}
          disabled={isSystem}
        >
          {isNew ? 'Створити роль' : 'Зберегти зміни'}
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
