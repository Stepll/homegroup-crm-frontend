import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Typography, Tag, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

const { Title } = Typography

export function GroupsPageDesktop() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).finally(() => setLoading(false))
  }, [])

  const columns = [
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, g: Group) => (
        <span style={{ fontWeight: 600, color: g.color ?? '#2AAFCA' }}>{name}</span>
      ),
    },
    {
      title: 'День зустрічі',
      key: 'schedule',
      render: (_: unknown, g: Group) => [g.meetingDay, g.meetingTime].filter(Boolean).join(' ') || '—',
    },
    {
      title: 'Місце',
      dataIndex: 'location',
      key: 'location',
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Учасників',
      dataIndex: 'memberCount',
      key: 'memberCount',
      align: 'center' as const,
      render: (n: number) => <Tag color="blue">{n}</Tag>,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Домашні групи</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/groups/new')}>
          Додати групу
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <Table
          dataSource={groups}
          columns={columns}
          rowKey="id"
          onRow={(g) => ({ onClick: () => navigate(`/cabinet/${g.id}`), style: { cursor: 'pointer' } })}
          pagination={false}
        />
      )}
    </div>
  )
}
