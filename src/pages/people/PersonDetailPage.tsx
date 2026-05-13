import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, Button, Toast, SpinLoading, Dialog, Popup } from 'antd-mobile'
import { EditSOutline, DeleteOutline, AddOutline } from 'antd-mobile-icons'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import { adminsApi } from '@/api/admins'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import type { Person, CustomField, Group, Admin } from '@/types'

// ── Editable field component ──────────────────────────────────────────────────

function EditableField({
  label, display, onSave,
  renderEditor,
}: {
  label: string
  display: string
  onSave: (val: string) => Promise<void>
  renderEditor: (val: string, onChange: (v: string) => void) => ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(display)
  const [saving, setSaving] = useState(false)

  const start = () => { setDraft(display); setEditing(true) }
  const cancel = () => setEditing(false)
  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } catch { Toast.show({ content: 'Помилка збереження', icon: 'fail' }) }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      {editing ? (
        <div>
          <div style={inputWrap}>{renderEditor(draft, setDraft)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="mini" loading={saving} onClick={save}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Зберегти
            </Button>
            <Button size="mini" fill="outline" onClick={cancel}>Скасувати</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 15, color: display ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
            {display || '—'}
          </span>
          <button onClick={start} style={iconBtn}><EditSOutline /></button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const personId = Number(id)

  const [person, setPerson] = useState<Person | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [statuses, setStatuses] = useState<PersonStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [addFieldVisible, setAddFieldVisible] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')

  // Oversight block edit state
  const [oversightEditing, setOversightEditing] = useState(false)
  const [draftOversightUserId, setDraftOversightUserId] = useState<number | null>(null)
  const [draftStatusId, setDraftStatusId] = useState<number | null>(null)
  const [oversightSaving, setOversightSaving] = useState(false)

  const load = () =>
    Promise.all([peopleApi.getById(personId), groupsApi.getAll(), adminsApi.getAll(), personStatusesApi.getAll()])
      .then(([p, g, a, s]) => { setPerson(p); setGroups(g); setAdmins(a); setStatuses(s) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [personId])

  if (loading || !person) {
    return (
      <div>
        <NavBar onBack={() => navigate('/people')}>Людина</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  // Helper: save one field and reload
  const save = async (patch: Partial<Parameters<typeof peopleApi.update>[1]>) => {
    const updated = await peopleApi.update(personId, {
      name: person.name,
      lastName: person.lastName,
      phone: person.phone,
      email: person.email,
      notes: person.notes,
      personStatusId: person.status?.id ?? null,
      oversightInfo: person.oversightInfo,
      oversightUserId: person.oversightUserId ?? null,
      dateOfBirth: person.dateOfBirth,
      primaryGroupId: person.primaryGroupId,
      ...patch,
    })
    setPerson(updated)
  }

  const startOversightEdit = () => {
    setDraftOversightUserId(person.oversightUserId ?? null)
    setDraftStatusId(person.status?.id ?? null)
    setOversightEditing(true)
  }

  const cancelOversightEdit = () => setOversightEditing(false)

  const saveOversight = async () => {
    setOversightSaving(true)
    try {
      await save({ oversightUserId: draftOversightUserId ?? undefined, personStatusId: draftStatusId ?? null })
      setOversightEditing(false)
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    }
    setOversightSaving(false)
  }

  const fullName = [person.name, person.lastName].filter(Boolean).join(' ')

  const handleDelete = async () => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити людину?',
      content: `"${fullName}" буде видалено назавжди.`,
      confirmText: 'Видалити', cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await peopleApi.remove(personId)
      Toast.show({ content: 'Видалено', icon: 'success' })
      navigate('/people', { replace: true })
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  const handleAddField = () => {
    setNewFieldName('')
    setAddFieldVisible(true)
  }

  const handleAddFieldConfirm = async () => {
    if (!newFieldName.trim()) return
    try {
      const field = await peopleApi.addCustomField(personId, newFieldName.trim())
      setPerson((p) => p ? { ...p, customFields: [...(p.customFields ?? []), field] } : p)
      setAddFieldVisible(false)
    } catch {
      Toast.show({ content: 'Помилка додавання поля', icon: 'fail' })
    }
  }

  const handleDeleteField = async (field: CustomField) => {
    const confirmed = await Dialog.confirm({
      title: `Видалити поле "${field.name}"?`,
      confirmText: 'Видалити', cancelText: 'Скасувати',
    })
    if (!confirmed) return
    await peopleApi.deleteCustomField(personId, field.id)
    setPerson((p) => p ? { ...p, customFields: p.customFields?.filter((f) => f.id !== field.id) } : p)
  }

  const handleSaveCustomField = async (field: CustomField, value: string) => {
    const updated = await peopleApi.updateCustomField(personId, field.id, value || undefined)
    setPerson((p) => p ? {
      ...p, customFields: p.customFields?.map((f) => f.id === updated.id ? updated : f),
    } : p)
  }

  const oversightUserName = admins.find((a) => a.id === person.oversightUserId)
    ? [admins.find((a) => a.id === person.oversightUserId)!.name, admins.find((a) => a.id === person.oversightUserId)!.lastName].filter(Boolean).join(' ')
    : person.oversightUserName

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/people')}>
        {fullName || 'Людина'}
      </NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* Block 1: Basic */}
        <div style={block}>
          <EditableField
            label="Ім'я"
            display={person.name}
            onSave={(v) => save({ name: v || person.name })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="Ім'я" />}
          />
          <EditableField
            label="Прізвище"
            display={person.lastName ?? ''}
            onSave={(v) => save({ lastName: v || undefined })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="Прізвище" />}
          />
          <EditableField
            label="Домашня група"
            display={person.primaryGroupName ?? ''}
            onSave={async (v) => {
              const group = groups.find((g) => g.name === v)
              await save({ primaryGroupId: group?.id ?? undefined })
            }}
            renderEditor={(_, onChange) => (
              <select
                defaultValue={person.primaryGroupId ?? ''}
                onChange={(e) => {
                  const g = groups.find((g) => g.id === Number(e.target.value))
                  onChange(g?.name ?? '')
                }}
                style={nativeSelect}
              >
                <option value="">— не вибрано —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          />
          <EditableField
            label="Дата народження"
            display={person.dateOfBirth ?? ''}
            onSave={(v) => save({ dateOfBirth: v || undefined })}
            renderEditor={(v, onChange) => (
              <input type="date" value={v} onChange={(e) => onChange(e.target.value)}
                style={{ ...nativeSelect, padding: 0 }} />
            )}
          />
        </div>

        {/* Block 2: Oversight */}
        <div style={{ ...block, padding: '12px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: oversightEditing ? 12 : 4 }}>
            <span style={blockLabel}>Опіка</span>
            {!oversightEditing && (
              <button onClick={startOversightEdit} style={iconBtn}><EditSOutline /></button>
            )}
          </div>

          {oversightEditing ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={fieldLabel}>Опікун</div>
                <div style={inputWrap}>
                  <select
                    value={draftOversightUserId ?? ''}
                    onChange={(e) => setDraftOversightUserId(e.target.value ? Number(e.target.value) : null)}
                    style={nativeSelect}
                  >
                    <option value="">— не вибрано —</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {[a.name, a.lastName].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={fieldLabel}>Статус</div>
                <div style={inputWrap}>
                  <select
                    value={draftStatusId ?? ''}
                    onChange={(e) => setDraftStatusId(e.target.value ? Number(e.target.value) : null)}
                    style={nativeSelect}
                  >
                    <option value="">— не вибрано —</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="mini" loading={oversightSaving} onClick={saveOversight}
                  style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
                  Зберегти
                </Button>
                <Button size="mini" fill="outline" onClick={cancelOversightEdit}>Скасувати</Button>
              </div>
            </>
          ) : (
            <>
              <div style={labelRow}>
                <span style={fieldLabel}>Опікун</span>
                <span style={{ fontSize: 15, color: oversightUserName ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
                  {oversightUserName || '—'}
                </span>
              </div>
              <div style={{ ...labelRow, borderBottom: 'none' }}>
                <span style={fieldLabel}>Статус</span>
                {person.status ? (
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 20,
                    background: person.status.color + '22',
                    color: person.status.color,
                    fontWeight: 600,
                    fontSize: 13,
                  }}>
                    {person.status.name}
                  </span>
                ) : (
                  <span style={{ fontSize: 15, color: 'var(--color-text-tertiary)' }}>—</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Block 3: Custom fields */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={blockLabel}>Додаткова інформація</span>
            {person.primaryGroupId && (
              <button onClick={handleAddField} style={{ ...iconBtn, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                <AddOutline /> Додати поле
              </button>
            )}
          </div>

          {!person.primaryGroupId && (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Призначте людину до групи, щоб додавати поля</span>
          )}

          {person.primaryGroupId && (person.customFields ?? []).length === 0 && (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Немає додаткових полів</span>
          )}

          {(person.customFields ?? []).map((field) => (
            <CustomFieldRow
              key={field.id}
              field={field}
              onSave={(v) => handleSaveCustomField(field, v)}
              onDelete={() => handleDeleteField(field)}
            />
          ))}
        </div>

        {/* Add custom field popup */}
        <Popup visible={addFieldVisible} onMaskClick={() => setAddFieldVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нове поле</div>
          <div style={inputWrap}>
            <Input placeholder="Назва поля" value={newFieldName} onChange={setNewFieldName} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button block onClick={handleAddFieldConfirm}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Додати
            </Button>
            <Button block fill="outline" onClick={() => setAddFieldVisible(false)}>Скасувати</Button>
          </div>
        </Popup>

        {/* Delete */}
        <Button block onClick={handleDelete}
          style={{
            '--background-color': 'transparent', '--border-color': 'var(--color-error)',
            '--text-color': 'var(--color-error)', '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 8,
          } as React.CSSProperties}>
          Видалити людину
        </Button>
      </div>
    </div>
  )
}

// ── Custom field row ──────────────────────────────────────────────────────────

function CustomFieldRow({ field, onSave, onDelete }: {
  field: CustomField
  onSave: (v: string) => Promise<void>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(field.value ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, flex: 1 }}>{field.name}</span>
        <button onClick={onDelete} style={{ ...iconBtn, color: 'var(--color-error)' }}><DeleteOutline /></button>
      </div>
      {editing ? (
        <div>
          <div style={inputWrap}>
            <Input value={draft} onChange={setDraft} placeholder="Значення" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="mini" loading={saving} onClick={save}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Зберегти
            </Button>
            <Button size="mini" fill="outline" onClick={() => setEditing(false)}>Скасувати</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 15, color: field.value ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
            {field.value || '—'}
          </span>
          <button onClick={() => { setDraft(field.value ?? ''); setEditing(true) }} style={iconBtn}>
            <EditSOutline />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '0 16px', marginTop: 16,
  boxShadow: 'var(--shadow-sm)',
}
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 4,
  cursor: 'pointer', color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center', fontSize: 16,
}
const nativeSelect: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', fontSize: 15, color: 'var(--color-text)',
}
const blockLabel: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const fieldLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 4,
}
const labelRow: React.CSSProperties = {
  padding: '8px 0',
  borderBottom: '1px solid var(--color-border-light)',
  display: 'flex', flexDirection: 'column', gap: 2,
}
