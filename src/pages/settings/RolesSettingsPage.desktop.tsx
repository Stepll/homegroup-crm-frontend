import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Modal, Typography, Space, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { rolesApi, type Role } from '@/api/roles'

const { Title } = Typography

export function RolesSettingsPageDesktop() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    rolesApi.getAll()
      .then(setRoles)
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = (role: Role) => {
    Modal.confirm({
      title: 'Видалити роль?',
      content: `"${role.name}" буде видалено назавжди.`,
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await rolesApi.delete(role.id)
        setRoles((prev) => prev.filter((r) => r.id !== role.id))
      },
    })
  }

  const columns = [
    {
      title: 'Назва',
      key: 'name',
      render: (_: unknown, record: Role) => (
        <Space>
          <span style={{ color: record.color, fontWeight: 600, fontSize: 14 }}>{record.name}</span>
          {record.isSystem && <Tag color="blue" style={{ fontSize: 11 }}>системна</Tag>}
          {record.isDefault && <Tag color="green" style={{ fontSize: 11 }}>за замовч.</Tag>}
        </Space>
      ),
    },
    {
      title: 'Опис',
      dataIndex: 'description',
      key: 'description',
      render: (d: string | null) => d ?? <span style={{ color: 'rgba(0,0,0,0.3)' }}>—</span>,
    },
    {
      title: 'Користувачів',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 120,
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 90,
      render: (_: unknown, record: Role) => (
        <Space>
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/settings/roles/${record.id}`)}
          />
          {!record.isSystem && (
            <Button
              type="text" size="small" danger icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Ролі</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/roles/new')}>
          Нова роль
        </Button>
      </div>
      <Table
        dataSource={roles}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Ролей ще немає' }}
      />
    </div>
  )
}
