import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Input, Button, Toast } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

export function PersonCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [groupId, setGroupId] = useState<number | undefined>()
  const [groups, setGroups] = useState<Group[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ content: 'Ім\'я обов\'язкове', icon: 'fail' })
      return
    }
    setSaving(true)
    try {
      const person = await peopleApi.create({ name: name.trim(), lastName: lastName.trim() || undefined, primaryGroupId: groupId })
      navigate(`/people/${person.id}`, { replace: true })
    } catch {
      Toast.show({ content: 'Помилка створення', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/people')}>Нова людина</NavBar>

      <div style={{ padding: '0 12px' }}>

        <div style={sec}>
          <label style={lbl}>Ім'я <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <div style={wrap}>
            <Input placeholder="Ім'я" value={name} onChange={setName} />
          </div>
        </div>

        <div style={sec}>
          <label style={lbl}>Прізвище</label>
          <div style={wrap}>
            <Input placeholder="Прізвище" value={lastName} onChange={setLastName} />
          </div>
        </div>

        <div style={sec}>
          <label style={lbl}>Домашня група</label>
          <div style={{ ...wrap, padding: '8px 14px' }}>
            <select
              value={groupId ?? ''}
              onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : undefined)}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--color-text)' }}
            >
              <option value="">— не вибрано —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Button
          block loading={saving} onClick={handleSave}
          style={{
            '--background-color': 'var(--color-primary)',
            '--border-color': 'var(--color-primary)',
            '--text-color': '#fff',
            '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 24,
          } as React.CSSProperties}
        >
          Створити
        </Button>
      </div>
    </div>
  )
}

const sec: React.CSSProperties = { marginTop: 20 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }
const wrap: React.CSSProperties = { background: '#fff', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', padding: '10px 14px' }
