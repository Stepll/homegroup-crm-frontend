import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, List, Checkbox, Button, Toast, SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import { attendanceApi } from '@/api/attendance'
import type { Person } from '@/types'

export function AttendancePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [members, setMembers] = useState<Person[]>([])
  const [present, setPresent] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    groupsApi.getMembers(Number(id))
      .then((m) => { setMembers(m); setPresent(new Set(m.map((p) => p.id))) })
      .finally(() => setLoading(false))
  }, [id])

  const toggle = (personId: number) => {
    setPresent((prev) => {
      const next = new Set(prev)
      next.has(personId) ? next.delete(personId) : next.add(personId)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await attendanceApi.record({
        homeGroupId: Number(id),
        meetingDate: today,
        entries: members.map((m) => ({ personId: m.id, wasPresent: present.has(m.id) })),
      })
      Toast.show({ content: 'Збережено!', icon: 'success' })
      navigate(`/groups/${id}`)
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}><SpinLoading /></div>

  return (
    <div>
      <NavBar onBack={() => navigate(`/groups/${id}`)}>Відвідуваність</NavBar>
      <div style={{ padding: '8px 16px', color: '#999' }}>{today}</div>
      <List>
        {members.map((m) => (
          <List.Item
            key={m.id}
            prefix={
              <Checkbox
                checked={present.has(m.id)}
                onChange={() => toggle(m.id)}
              />
            }
            onClick={() => toggle(m.id)}
          >
            {m.name}
          </List.Item>
        ))}
      </List>
      <div style={{ padding: 16 }}>
        <Button block color="primary" size="large" loading={saving} onClick={save}>
          Зберегти ({present.size}/{members.length})
        </Button>
      </div>
    </div>
  )
}
