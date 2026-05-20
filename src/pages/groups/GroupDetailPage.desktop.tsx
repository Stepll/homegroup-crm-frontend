import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Typography, Space, Tag, Spin, Card } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import type { Group, GroupMember } from '@/types'

const { Title, Text } = Typography

export function GroupDetailPageDesktop() {
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
  if (!group) return <div style={{ padding: 24 }}>Групу не знайдено</div>

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{group.name}</Title>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        {group.meetingDay && (
          <Text style={{ display: 'block' }}>{group.meetingDay} {group.meetingTime}</Text>
        )}
        {group.location && (
          <Text type="secondary" style={{ display: 'block' }}>{group.location}</Text>
        )}
        <Button
          type="primary"
          style={{ marginTop: 12 }}
          onClick={() => navigate(`/cabinet/${id}`)}
        >
          Відкрити кабінет групи
        </Button>
      </Card>

      <Card title={`Учасники (${members.length})`}>
        {members.length === 0 ? (
          <Text type="secondary">Учасників ще немає</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map((m) => {
              const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
              const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
              return (
                <div
                  key={key}
                  onClick={() => !m.isAdmin && navigate(`/people/${m.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', cursor: m.isAdmin ? 'default' : 'pointer',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <Text style={{ fontWeight: 500 }}>{fullName}</Text>
                  {m.isAdmin && m.roleTag && (
                    <Tag style={{ color: m.roleTag.color, background: `${m.roleTag.color}18`, borderColor: `${m.roleTag.color}40` }}>
                      {m.roleTag.name}
                    </Tag>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
