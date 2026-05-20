import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, List, Button, SpinLoading, Empty } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import type { Group, GroupMember } from '@/types'

export function GroupDetailPageMobile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
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
            <List.Item
              key={m.isAdmin ? `u_${m.userId}` : `p_${m.id}`}
              onClick={() => !m.isAdmin && navigate(`/people/${m.id}`)}
              arrow={!m.isAdmin}
              extra={m.isAdmin && m.roleTag ? (
                <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 6px', color: m.roleTag.color, background: `${m.roleTag.color}18` }}>
                  {m.roleTag.name}
                </span>
              ) : undefined}
            >
              {[m.name, m.lastName].filter(Boolean).join(' ')}
            </List.Item>
          ))
        }
      </List>
    </div>
  )
}
