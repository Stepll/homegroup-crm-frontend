import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, Button, Toast, SpinLoading, Dialog, Popup } from 'antd-mobile'
import { EditSOutline, DeleteOutline, CloseOutline } from 'antd-mobile-icons'
import { adminsApi } from '@/api/admins'
import { groupsApi } from '@/api/groups'
import { rolesApi } from '@/api/roles'
import type { Admin, RoleTag, Group } from '@/types'
import type { Role } from '@/api/roles'

// ── Editable field ────────────────────────────────────────────────────────────

function EditableField({
  label, display, onSave, renderEditor,
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

export function AdminDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminId = Number(id)

  const [admin, setAdmin] = useState<Admin | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [pwdVisible, setPwdVisible] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  const load = () =>
    Promise.all([adminsApi.getById(adminId), groupsApi.getAll(), rolesApi.getAll()])
      .then(([a, g, r]) => { setAdmin(a); setGroups(g); setRoles(r) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [adminId])

  if (loading || !admin) {
    return (
      <div>
        <NavBar onBack={() => navigate('/settings/admins')}>Адмін</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  const save = async (patch: Partial<Parameters<typeof adminsApi.update>[1]>) => {
    const updated = await adminsApi.update(adminId, {
      name: admin.name,
      lastName: admin.lastName,
      email: admin.email,
      roleIds: admin.roles.map((r) => r.id),
      primaryGroupId: admin.primaryGroupId,
      visibleGroupIds: admin.visibleGroups.map((g) => g.id),
      ...patch,
    })
    setAdmin(updated)
  }

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')

  const handleDelete = async () => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити адміна?',
      content: `"${fullName}" буде видалено назавжди.`,
      confirmText: 'Видалити', cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await adminsApi.remove(adminId)
      Toast.show({ content: 'Видалено', icon: 'success' })
      navigate('/settings/admins', { replace: true })
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  const handleSetPassword = async () => {
    if (!newPwd.trim()) return
    setPwdSaving(true)
    try {
      await adminsApi.setPassword(adminId, newPwd)
      Toast.show({ content: 'Пароль змінено', icon: 'success' })
      setPwdVisible(false)
      setNewPwd('')
    } catch {
      Toast.show({ content: 'Помилка зміни пароля', icon: 'fail' })
    }
    setPwdSaving(false)
  }

  const toggleRole = async (role: Role) => {
    const hasRole = admin.roles.some((r) => r.id === role.id)
    const newRoleIds = hasRole
      ? admin.roles.filter((r) => r.id !== role.id).map((r) => r.id)
      : [...admin.roles.map((r) => r.id), role.id]
    await save({ roleIds: newRoleIds })
  }

  const toggleVisibleGroup = async (group: Group) => {
    const has = admin.visibleGroups.some((g) => g.id === group.id)
    const newIds = has
      ? admin.visibleGroups.filter((g) => g.id !== group.id).map((g) => g.id)
      : [...admin.visibleGroups.map((g) => g.id), group.id]
    await save({ visibleGroupIds: newIds })
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/settings/admins')}>
        {fullName || 'Адмін'}
      </NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* Block 1: Basic info */}
        <div style={block}>
          <EditableField
            label="Ім'я"
            display={admin.name}
            onSave={(v) => save({ name: v || admin.name })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="Ім'я" />}
          />
          <EditableField
            label="Прізвище"
            display={admin.lastName ?? ''}
            onSave={(v) => save({ lastName: v || undefined })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="Прізвище" />}
          />
          <EditableField
            label="Email"
            display={admin.email}
            onSave={(v) => save({ email: v || admin.email })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="email@example.com" type="email" />}
          />
        </div>

        {/* Block 2: Password */}
        <div style={block}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 500 }}>Безпека</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                size="small" fill="outline"
                style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                onClick={() => { setNewPwd(''); setPwdVisible(true) }}
              >
                Змінити пароль
              </Button>
              <Button size="small" fill="outline" disabled
                style={{ '--border-color': 'var(--color-border)', '--text-color': 'var(--color-text-tertiary)' } as React.CSSProperties}
              >
                Запит про зміну
              </Button>
            </div>
          </div>
        </div>

        {/* Block 3: Roles */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, fontWeight: 500 }}>Ролі</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {admin.roles.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Без ролі</span>
            )}
            {admin.roles.map((role) => (
              <span key={role.id} style={{ ...roleTag, color: role.color, background: `${role.color}18`, display: 'flex', alignItems: 'center', gap: 4 }}>
                {role.name}
                <button onClick={() => toggleRole(roles.find((r) => r.id === role.id)!)} style={removeBtn}>
                  <CloseOutline style={{ fontSize: 10 }} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {roles.filter((r) => !admin.roles.some((ar) => ar.id === r.id)).map((role) => (
              <button key={role.id} onClick={() => toggleRole(role)}
                style={{ ...roleTag, color: role.color, background: 'transparent', border: `1.5px dashed ${role.color}` }}>
                + {role.name}
              </button>
            ))}
          </div>
        </div>

        {/* Block 4: Primary group */}
        <div style={block}>
          <EditableField
            label="Рідна домашка"
            display={admin.primaryGroupName ?? ''}
            onSave={async (v) => {
              const group = groups.find((g) => g.name === v)
              await save({ primaryGroupId: group?.id ?? undefined })
            }}
            renderEditor={(_, onChange) => (
              <select
                defaultValue={admin.primaryGroupId ?? ''}
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
        </div>

        {/* Block 5: Visible groups */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, fontWeight: 500 }}>Видимі домашки</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {admin.visibleGroups.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Не вибрано</span>
            )}
            {admin.visibleGroups.map((g) => (
              <span key={g.id} style={{ ...roleTag, color: g.color, background: `${g.color}18`, display: 'flex', alignItems: 'center', gap: 4 }}>
                {g.name}
                <button onClick={() => toggleVisibleGroup(groups.find((gr) => gr.id === g.id)!)} style={removeBtn}>
                  <CloseOutline style={{ fontSize: 10 }} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {groups.filter((g) => !admin.visibleGroups.some((vg) => vg.id === g.id)).map((g) => (
              <button key={g.id} onClick={() => toggleVisibleGroup(g)}
                style={{ ...roleTag, color: g.color, background: 'transparent', border: `1.5px dashed ${g.color}` }}>
                + {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Delete */}
        {admin.id !== 0 && (
          <Button block onClick={handleDelete}
            style={{
              '--background-color': 'transparent', '--border-color': 'var(--color-error)',
              '--text-color': 'var(--color-error)', '--border-radius': 'var(--radius-md)',
              height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 8,
            } as React.CSSProperties}>
            Видалити адміна
          </Button>
        )}
      </div>

      {/* Change password popup */}
      <Popup visible={pwdVisible} onMaskClick={() => setPwdVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Новий пароль</div>
        <div style={inputWrap}>
          <Input
            placeholder="Введіть новий пароль"
            type="password"
            value={newPwd}
            onChange={setNewPwd}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button block loading={pwdSaving} onClick={handleSetPassword}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Зберегти
          </Button>
          <Button block fill="outline" onClick={() => setPwdVisible(false)}>Скасувати</Button>
        </div>
      </Popup>
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
const roleTag: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  borderRadius: 6, padding: '4px 8px',
  cursor: 'pointer', border: 'none',
  whiteSpace: 'nowrap',
}
const removeBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  color: 'inherit', opacity: 0.7,
}
