import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Input, Button, Toast } from 'antd-mobile'
import { CloseOutline } from 'antd-mobile-icons'
import { adminsApi } from '@/api/admins'
import { groupsApi } from '@/api/groups'
import { rolesApi } from '@/api/roles'
import type { Group } from '@/types'
import type { Role } from '@/api/roles'

export function AdminCreatePageMobile() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [primaryGroupId, setPrimaryGroupId] = useState<number | undefined>()
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  const [roles, setRoles] = useState<Role[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([rolesApi.getAll(), groupsApi.getAll()])
      .then(([r, g]) => { setRoles(r); setGroups(g) })
  }, [])

  const toggleRole = (id: number) =>
    setSelectedRoleIds((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])

  const toggleGroup = (id: number) =>
    setVisibleGroupIds((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id])

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Toast.show({ content: 'Заповніть імʼя, email та пароль', icon: 'fail' })
      return
    }
    setSaving(true)
    try {
      const admin = await adminsApi.create({
        name: name.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        password,
        roleIds: selectedRoleIds,
        primaryGroupId,
        visibleGroupIds,
      })
      Toast.show({ content: 'Адміна створено', icon: 'success' })
      navigate(`/settings/admins/${admin.id}`, { replace: true })
    } catch {
      Toast.show({ content: 'Помилка створення', icon: 'fail' })
    }
    setSaving(false)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/settings/admins')}>Новий адмін</NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* Basic info */}
        <div style={block}>
          <Field label="Ім'я">
            <Input value={name} onChange={setName} placeholder="Ім'я" />
          </Field>
          <Field label="Прізвище">
            <Input value={lastName} onChange={setLastName} placeholder="Прізвище" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
          </Field>
          <Field label="Пароль">
            <Input value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          </Field>
        </div>

        {/* Roles */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, fontWeight: 500 }}>Ролі</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {roles.map((role) => {
              const selected = selectedRoleIds.includes(role.id)
              return (
                <button key={role.id} onClick={() => toggleRole(role.id)}
                  style={{
                    ...roleTag,
                    color: role.color,
                    background: selected ? `${role.color}18` : 'transparent',
                    border: `1.5px ${selected ? 'solid' : 'dashed'} ${role.color}`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {selected && <CloseOutline style={{ fontSize: 10 }} />}
                  {role.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Primary group */}
        <div style={block}>
          <Field label="Рідна домашка">
            <select
              value={primaryGroupId ?? ''}
              onChange={(e) => setPrimaryGroupId(e.target.value ? Number(e.target.value) : undefined)}
              style={nativeSelect}
            >
              <option value="">— не вибрано —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Visible groups */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, fontWeight: 500 }}>Видимі домашки</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {groups.map((g) => {
              const selected = visibleGroupIds.includes(g.id)
              return (
                <button key={g.id} onClick={() => toggleGroup(g.id)}
                  style={{
                    ...roleTag,
                    color: g.color,
                    background: selected ? `${g.color}18` : 'transparent',
                    border: `1.5px ${selected ? 'solid' : 'dashed'} ${g.color}`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {selected && <CloseOutline style={{ fontSize: 10 }} />}
                  {g.name}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          block loading={saving} onClick={handleCreate}
          style={{
            '--background-color': 'var(--color-primary)', '--text-color': '#fff',
            '--border-color': 'var(--color-primary)', '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 16,
          } as React.CSSProperties}
        >
          Створити
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={inputWrap}>{children}</div>
    </div>
  )
}

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '0 16px', marginTop: 16,
  boxShadow: 'var(--shadow-sm)',
}
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const nativeSelect: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', fontSize: 15, color: 'var(--color-text)',
}
const roleTag: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  borderRadius: 6, padding: '4px 8px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
