import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Input, Typography, Space, Tag } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { adminsApi } from '@/api/admins'
import type { Admin } from '@/types'

const { Title } = Typography

export function AdminsPageDesktop() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminsApi.getAll().then(setAdmins).finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? admins.filter((a) => {
        const full = [a.name, a.lastName].filter(Boolean).join(' ').toLowerCase()
        return full.includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
      })
    : admins

  const columns = [
    {
      title: "Ім'я",
      key: 'name',
      render: (_: unknown, a: Admin) => (
        <span style={{ fontWeight: 500 }}>{[a.name, a.lastName].filter(Boolean).join(' ')}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Ролі',
      key: 'roles',
      render: (_: unknown, a: Admin) => (
        <Space size={4} wrap>
          {a.roles.map((r) => (
            <Tag key={r.id} style={{ color: r.color, background: `${r.color}18`, borderColor: `${r.color}40` }}>
              {r.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Група',
      key: 'group',
      render: (_: unknown, a: Admin) => a.primaryGroupName ? (
        <Tag style={{ color: a.primaryGroupColor ?? '#2AAFCA', background: `${a.primaryGroupColor ?? '#2AAFCA'}18`, borderColor: `${a.primaryGroupColor ?? '#2AAFCA'}40` }}>
          {a.primaryGroupName}
        </Tag>
      ) : <span style={{ color: 'rgba(0,0,0,0.3)' }}>—</span>,
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_: unknown, a: Admin) => (
        <Button type="link" onClick={() => navigate(`/settings/admins/${a.id}`)}>Деталі</Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Адміни</Title>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Пошук..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/admins/new')}>
            Додати
          </Button>
        </Space>
      </div>
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Адмінів не знайдено' }}
        onRow={(record) => ({ onClick: () => navigate(`/settings/admins/${record.id}`), style: { cursor: 'pointer' } })}
      />
    </div>
  )
}
