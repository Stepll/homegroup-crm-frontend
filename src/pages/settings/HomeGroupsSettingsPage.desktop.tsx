import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Modal, Typography, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

const { Title } = Typography

export function HomeGroupsSettingsPageDesktop() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    groupsApi.getAll()
      .then(setGroups)
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = (group: Group) => {
    Modal.confirm({
      title: 'Видалити групу?',
      content: `"${group.name}" буде видалено назавжди разом з усіма учасниками.`,
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await groupsApi.delete(group.id)
        setGroups((prev) => prev.filter((g) => g.id !== group.id))
      },
    })
  }

  const columns = [
    {
      title: 'Назва',
      key: 'name',
      render: (_: unknown, record: Group) => (
        <span style={{ color: record.color, fontWeight: 600, fontSize: 14 }}>{record.name}</span>
      ),
    },
    {
      title: 'Опис',
      dataIndex: 'description',
      key: 'description',
      render: (d: string | null) => d ?? <span style={{ color: 'rgba(0,0,0,0.3)' }}>—</span>,
    },
    {
      title: 'Учасників',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 110,
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 90,
      render: (_: unknown, record: Group) => (
        <Space>
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/settings/home-groups/${record.id}`)}
          />
          <Button
            type="text" size="small" danger icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Домашні групи</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/home-groups/new')}>
          Нова група
        </Button>
      </div>
      <Table
        dataSource={groups}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Груп ще немає' }}
      />
    </div>
  )
}
