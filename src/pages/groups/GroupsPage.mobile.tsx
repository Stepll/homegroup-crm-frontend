import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, Badge, Button, Empty, SpinLoading } from 'antd-mobile'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

export function GroupsPageMobile() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll()
      .then(setGroups)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <NavBar back={null} right={<Button size="small" color="primary" onClick={() => navigate('/groups/new')}>+ Додати</Button>}>
        Домашні групи
      </NavBar>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading />
        </div>
      ) : groups.length === 0 ? (
        <Empty description="Груп ще немає" style={{ marginTop: 48 }} />
      ) : (
        <List>
          {groups.map((g) => (
            <List.Item
              key={g.id}
              description={[g.meetingDay, g.meetingTime, g.location].filter(Boolean).join(' · ')}
              extra={<Badge content={g.memberCount} color="#1677ff" />}
              onClick={() => navigate(`/groups/${g.id}`)}
              arrow
            >
              {g.name}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}
