import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, List, Button, SpinLoading, Empty } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import type { Group, Person } from '@/types'

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const groupId = Number(id)
    Promise.all([groupsApi.getById(groupId), groupsApi.getMembers(groupId)])
      .then(([g, m]) => { setGroup(g); setMembers(m) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}><SpinLoading /></div>
  if (!group) return <div>Групу не знайдено</div>

  return (
    <div>
      <NavBar onBack={() => navigate('/groups')}>
        {group.name}
      </NavBar>
      <div style={{ padding: 16 }}>
        {group.meetingDay && <p>{group.meetingDay} {group.meetingTime}</p>}
        {group.location && <p style={{ color: '#999' }}>{group.location}</p>}
        <Button
          block
          color="primary"
          style={{ marginTop: 12 }}
          onClick={() => navigate(`/groups/${id}/attendance`)}
        >
          Відмітити відвідуваність
        </Button>
      </div>
      <List header="Учасники">
        {members.length === 0
          ? <Empty description="Учасників ще немає" />
          : members.map((m) => (
            <List.Item key={m.id} onClick={() => navigate(`/people/${m.id}`)} arrow>
              {m.name}
            </List.Item>
          ))
        }
      </List>
    </div>
  )
}
