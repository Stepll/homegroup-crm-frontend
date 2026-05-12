import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, TextArea, Button, Toast, SpinLoading, Dialog, Popup } from 'antd-mobile'
import { DeleteOutline, CloseOutline, AddOutline } from 'antd-mobile-icons'
import { groupsApi } from '@/api/groups'
import { peopleApi } from '@/api/people'
import type { Group, GroupCustomField, Person } from '@/types'

const COLORS = [
  '#2AAFCA', '#10B981', '#6366F1', '#F59E0B',
  '#EF4444', '#F97316', '#EC4899', '#64748B',
]

interface FormState { name: string; description: string; color: string }
const EMPTY: FormState = { name: '', description: '', color: '#2AAFCA' }

export function HomeGroupFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [members, setMembers] = useState<Person[]>([])
  const [customFields, setCustomFields] = useState<GroupCustomField[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [addFieldVisible, setAddFieldVisible] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [selected, setSelected] = useState<Person | null>(null)
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
      setForm({ name: group.name, description: group.description ?? '', color: group.color })
      setMembers(m as Person[])
      setCustomFields(cf as GroupCustomField[])
    }).catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
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

  const handleSearchFocus = () => {
    if (searchResults.length === 0 && !searching) fetchNoGroup(search)
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    setSelected(null)
    fetchNoGroup(val)
  }

  const handleSelect = (person: Person) => {
    setSelected(person)
    setSearch([person.name, person.lastName].filter(Boolean).join(' '))
    setSearchResults([])
  }

  const handleAdd = () => {
    if (!selected) return
    setMembers((prev) => [...prev, selected])
    setSelected(null)
    setSearch('')
    setSearchResults([])
  }

  const handleRemoveMember = (personId: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== personId))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Toast.show({ content: 'Назва обовʼязкова', icon: 'fail' })
      return
    }
    setSaving(true)
    try {
      let groupId: number
      if (isNew) {
        const created = await groupsApi.create({ ...form, isActive: true }) as Group
        groupId = created.id
      } else {
        await groupsApi.update(Number(id), { ...form, isActive: true })
        groupId = Number(id)
      }
      await groupsApi.syncMembers(groupId, members.map((m) => m.id))
      Toast.show({ content: 'Збережено', icon: 'success' })
      navigate('/settings/home-groups')
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddCustomField = async () => {
    if (!newFieldName.trim()) return
    try {
      const field = await groupsApi.addCustomField(Number(id), newFieldName.trim())
      setCustomFields((prev) => [...prev, field as GroupCustomField])
      setAddFieldVisible(false)
      setNewFieldName('')
    } catch {
      Toast.show({ content: 'Помилка додавання поля', icon: 'fail' })
    }
  }

  const handleDeleteCustomField = async (field: GroupCustomField) => {
    const confirmed = await Dialog.confirm({
      title: `Видалити поле "${field.name}"?`,
      content: 'Значення цього поля будуть видалені для всіх учасників.',
      confirmText: 'Видалити', cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await groupsApi.deleteCustomField(Number(id), field.id)
      setCustomFields((prev) => prev.filter((f) => f.id !== field.id))
    } catch {
      Toast.show({ content: 'Помилка видалення поля', icon: 'fail' })
    }
  }

  const handleDelete = async () => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити групу?',
      content: 'Цю дію не можна скасувати.',
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await groupsApi.delete(Number(id))
      Toast.show({ content: 'Групу видалено', icon: 'success' })
      navigate('/settings/home-groups')
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar onBack={() => navigate('/settings/home-groups')}>{isNew ? 'Нова група' : 'Редагування'}</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/settings/home-groups')}>
        {isNew ? 'Нова домашня група' : 'Редагування групи'}
      </NavBar>

      <div style={{ padding: '0 12px' }}>

        {/* Name */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Назва</label>
          <div style={inputWrap}>
            <Input
              placeholder="Назва групи"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
          </div>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Опис</label>
          <div style={inputWrap}>
            <TextArea
              placeholder="Короткий опис"
              rows={2}
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
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
                onClick={() => setForm((f) => ({ ...f, color }))}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: color, border: 'none',
                  outline: form.color === color ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: 2,
                  cursor: 'pointer', padding: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Members */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Учасники</label>

          {/* Search + Add */}
          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ ...inputWrap, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Input
                  placeholder="Пошук по імені..."
                  value={search}
                  onChange={handleSearch}
                  onFocus={handleSearchFocus}
                  style={{ flex: 1 }}
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setSearchResults([]); setSelected(null) }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex' }}
                  >
                    <CloseOutline />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {(searchResults.length > 0 || searching) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#fff', borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)', marginTop: 4, overflow: 'hidden',
                }}>
                  {searching ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>Пошук...</div>
                  ) : (
                    searchResults.slice(0, 8).map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handleSelect(person)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 14px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 14, color: 'var(--color-text)',
                          borderBottom: '1px solid var(--color-border-light)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <span style={{ flex: 1 }}>{[person.name, person.lastName].filter(Boolean).join(' ')}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#1a1a2e', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>без групи</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button
              disabled={!selected}
              onClick={handleAdd}
              style={{
                '--background-color': selected ? 'var(--color-primary)' : 'var(--color-border)',
                '--text-color': '#fff',
                '--border-color': selected ? 'var(--color-primary)' : 'var(--color-border)',
                '--border-radius': 'var(--radius-md)',
                height: 44, flexShrink: 0,
              } as React.CSSProperties}
            >
              Додати
            </Button>
          </div>

          {/* Members list */}
          {members.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((person) => (
                <div key={person.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 14px',
                  background: '#fff', borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <span
                    style={{ flex: 1, fontSize: 14, color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => navigate(`/people/${person.id}`)}
                  >
                    {[person.name, person.lastName].filter(Boolean).join(' ')}
                  </span>
                  <button
                    onClick={() => handleRemoveMember(person.id)}
                    style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-error)', display: 'flex' }}
                  >
                    <DeleteOutline />
                  </button>
                </div>
              ))}
            </div>
          )}

          {members.length === 0 && (
            <div style={{ marginTop: 8, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              Учасників ще немає
            </div>
          )}
        </div>

        {/* Custom fields — only for existing groups */}
        {!isNew && (
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>Додаткові поля</label>
              <button
                onClick={() => { setNewFieldName(''); setAddFieldVisible(true) }}
                style={{ background: 'none', border: 'none', padding: '0 0 0 8px', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
              >
                <AddOutline /> Додати
              </button>
            </div>
            {customFields.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Немає додаткових полів</div>
            )}
            {customFields.map((field) => (
              <div key={field.id} style={{
                display: 'flex', alignItems: 'center', padding: '10px 14px',
                background: '#fff', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)', marginBottom: 8,
              }}>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{field.name}</span>
                <button
                  onClick={() => handleDeleteCustomField(field)}
                  style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-error)', display: 'flex' }}
                >
                  <DeleteOutline />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add field popup */}
        <Popup visible={addFieldVisible} onMaskClick={() => setAddFieldVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нове поле</div>
          <div style={inputWrap}>
            <Input placeholder="Назва поля" value={newFieldName} onChange={setNewFieldName} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button block onClick={handleAddCustomField}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Додати
            </Button>
            <Button block fill="outline" onClick={() => setAddFieldVisible(false)}>Скасувати</Button>
          </div>
        </Popup>

        {/* Save */}
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
            marginTop: 8,
          } as React.CSSProperties}
        >
          {isNew ? 'Створити групу' : 'Зберегти зміни'}
        </Button>

        {/* Delete */}
        {!isNew && (
          <Button
            block
            onClick={handleDelete}
            style={{
              '--background-color': 'transparent',
              '--border-color': 'var(--color-error)',
              '--text-color': 'var(--color-error)',
              '--border-radius': 'var(--radius-md)',
              height: 48, fontSize: 'var(--font-base)', fontWeight: 600,
              marginTop: 12,
            } as React.CSSProperties}
          >
            Видалити групу
          </Button>
        )}
      </div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = { marginTop: 20 }
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em',
}
const inputWrap: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '10px 14px',
}
