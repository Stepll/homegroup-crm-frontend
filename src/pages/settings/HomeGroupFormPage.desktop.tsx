import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Spin, Typography, Space, Modal, Select, Row, Col, Tag } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import { peopleApi } from '@/api/people'
import type { Group, GroupCustomField, GroupMember } from '@/types'

const { Title } = Typography

const COLORS = [
  '#2AAFCA', '#10B981', '#6366F1', '#F59E0B',
  '#EF4444', '#F97316', '#EC4899', '#64748B',
]

const MEETING_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

interface FormState {
  name: string; description: string; color: string
  meetingDay: string; meetingTime: string; meetingEndTime: string; location: string
}
const EMPTY: FormState = { name: '', description: '', color: '#2AAFCA', meetingDay: '', meetingTime: '', meetingEndTime: '', location: '' }

export function HomeGroupFormPageDesktop() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [customFields, setCustomFields] = useState<GroupCustomField[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [addFieldOpen, setAddFieldOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<GroupMember[]>([])
  const [, setSelected] = useState<GroupMember | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isNew) return
    Promise.all([
      groupsApi.getById(Number(id)),
      groupsApi.getMembers(Number(id)),
      groupsApi.getCustomFields(Number(id)),
    ]).then(([g, m, cf]) => {
      const group = g as Group
      setForm({
        name: group.name, description: group.description ?? '', color: group.color,
        meetingDay: group.meetingDay ?? '', meetingTime: group.meetingTime ?? '',
        meetingEndTime: group.meetingEndTime ?? '', location: group.location ?? '',
      })
      setMembers((m as GroupMember[]).filter((x) => !x.isAdmin))
      setCustomFields(cf as GroupCustomField[])
    }).catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const fetchNoGroup = (query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(() => {
      peopleApi.getAll(query || undefined, true)
        .then((results) => setSearchResults(results.filter((p) => !members.some((m) => m.id === p.id))))
        .finally(() => setSearching(false))
    }, query ? 300 : 0)
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    setSelected(null)
    fetchNoGroup(val)
  }

  const handleSelect = (person: GroupMember) => {
    setMembers((prev) => [...prev, { ...person, isAdmin: false }])
    setSelected(null)
    setSearch('')
    setSearchResults([])
  }

  const handleRemoveMember = (personId: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== personId))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { Modal.error({ title: "Назва обов'язкова" }); return }
    setSaving(true)
    try {
      let groupId: number
      const payload = {
        name: form.name.trim(), description: form.description.trim() || undefined,
        color: form.color, meetingDay: form.meetingDay || undefined,
        meetingTime: form.meetingTime || undefined, meetingEndTime: form.meetingEndTime || undefined,
        location: form.location.trim() || undefined, isActive: true,
      }
      if (isNew) {
        const created = await groupsApi.create(payload) as Group
        groupId = created.id
      } else {
        await groupsApi.update(Number(id), payload)
        groupId = Number(id)
      }
      await groupsApi.syncMembers(groupId, members.map((m) => m.id))
      navigate('/settings/home-groups')
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally { setSaving(false) }
  }

  const handleAddCustomField = async () => {
    if (!newFieldName.trim()) return
    try {
      const field = await groupsApi.addCustomField(Number(id), newFieldName.trim())
      setCustomFields((prev) => [...prev, field as GroupCustomField])
      setAddFieldOpen(false)
      setNewFieldName('')
    } catch {
      Modal.error({ title: 'Помилка додавання поля' })
    }
  }

  const handleDeleteCustomField = (field: GroupCustomField) => {
    Modal.confirm({
      title: `Видалити поле "${field.name}"?`,
      content: 'Значення цього поля будуть видалені для всіх учасників.',
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await groupsApi.deleteCustomField(Number(id), field.id)
        setCustomFields((prev) => prev.filter((f) => f.id !== field.id))
      },
    })
  }

  const handleDeleteGroup = () => {
    Modal.confirm({
      title: 'Видалити групу?',
      content: 'Цю дію не можна скасувати.',
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await groupsApi.delete(Number(id))
        navigate('/settings/home-groups')
      },
    })
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings/home-groups')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{isNew ? 'Нова домашня група' : 'Редагування групи'}</Title>
      </Space>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <Row gutter={[20, 20]}>
          <Col span={16}>
            <div style={labelStyle}>Назва<span style={requiredStyle}>*</span></div>
            <Input
              placeholder="Назва групи" size="large"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Col>
          <Col span={8}>
            <div style={labelStyle}>Колір</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: color, border: 'none',
                    outline: form.color === color ? `3px solid ${color}` : '3px solid transparent',
                    outlineOffset: 2, cursor: 'pointer', padding: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}
                />
              ))}
            </div>
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Опис</div>
          <Input.TextArea
            placeholder="Короткий опис" rows={2}
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={labelStyle}>Розклад</div>
          <Row gutter={[12, 12]}>
            <Col span={8}>
              <Select
                value={form.meetingDay || undefined}
                onChange={(v) => setForm((f) => ({ ...f, meetingDay: v ?? '' }))}
                placeholder="— день —"
                allowClear style={{ width: '100%' }}
              >
                {MEETING_DAYS.map((d) => <Select.Option key={d} value={d}>{d}</Select.Option>)}
              </Select>
            </Col>
            <Col span={7}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>Початок</div>
                <Input type="time" value={form.meetingTime} onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))} />
              </div>
            </Col>
            <Col span={7}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>Кінець</div>
                <Input type="time" value={form.meetingEndTime} onChange={(e) => setForm((f) => ({ ...f, meetingEndTime: e.target.value }))} />
              </div>
            </Col>
          </Row>
          <div style={{ marginTop: 8 }}>
            <Input
              placeholder="Адреса зустрічі"
              value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={labelStyle}>Учасники</div>
          <div style={{ display: 'flex', gap: 8, position: 'relative', marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Input
                placeholder="Пошук по імені..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => { if (searchResults.length === 0 && !searching) fetchNoGroup(search) }}
                autoComplete="off"
              />
              {(searchResults.length > 0 || searching) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  marginTop: 4, overflow: 'hidden',
                }}>
                  {searching ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>Пошук...</div>
                  ) : searchResults.slice(0, 8).map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleSelect(person)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 14px',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <span style={{ flex: 1 }}>{[person.name, person.lastName].filter(Boolean).join(' ')}</span>
                      <Tag style={{ fontSize: 11 }}>без групи</Tag>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {members.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {members.map((person) => (
                <Tag
                  key={person.id}
                  closable
                  onClose={() => handleRemoveMember(person.id)}
                  style={{ fontSize: 13, padding: '4px 8px' }}
                >
                  {[person.name, person.lastName].filter(Boolean).join(' ')}
                </Tag>
              ))}
            </div>
          ) : (
            <div style={{ color: 'rgba(0,0,0,0.35)', fontSize: 13 }}>Учасників ще немає</div>
          )}
        </div>

        {!isNew && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={labelStyle}>Додаткові поля</div>
              <Button
                type="link" size="small" icon={<PlusOutlined />}
                onClick={() => { setNewFieldName(''); setAddFieldOpen(true) }}
                style={{ padding: 0 }}
              >
                Додати
              </Button>
            </div>
            {customFields.length === 0 ? (
              <div style={{ color: 'rgba(0,0,0,0.35)', fontSize: 13 }}>Немає додаткових полів</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {customFields.map((field) => (
                  <Tag
                    key={field.id}
                    closable
                    onClose={() => handleDeleteCustomField(field)}
                    style={{ fontSize: 13, padding: '4px 8px' }}
                  >
                    {field.name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Button
            type="primary" loading={saving} onClick={handleSave}
            size="large" style={{ flex: 1, fontWeight: 600 }}
          >
            {isNew ? 'Створити групу' : 'Зберегти зміни'}
          </Button>
          {!isNew && (
            <Button danger size="large" icon={<DeleteOutlined />} onClick={handleDeleteGroup}>
              Видалити
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={addFieldOpen}
        title="Нове додаткове поле"
        onCancel={() => setAddFieldOpen(false)}
        onOk={handleAddCustomField}
        okText="Додати" cancelText="Скасувати"
        destroyOnClose
      >
        <div style={{ ...labelStyle, marginBottom: 6 }}>Назва поля<span style={requiredStyle}>*</span></div>
        <Input
          placeholder="Назва поля"
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          onPressEnter={handleAddCustomField}
          autoFocus
        />
      </Modal>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
}

const requiredStyle: React.CSSProperties = { color: '#EF4444', marginLeft: 4 }
