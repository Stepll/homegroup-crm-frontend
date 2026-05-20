import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Modal, Typography, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'

const { Title } = Typography

export function PersonStatusesPageDesktop() {
  const navigate = useNavigate()
  const [statuses, setStatuses] = useState<PersonStatus[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    personStatusesApi.getAll()
      .then(setStatuses)
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = (status: PersonStatus) => {
    Modal.confirm({
      title: 'Видалити статус?',
      content: `"${status.name}" буде видалено. У людей з цим статусом він стане порожнім.`,
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await personStatusesApi.delete(status.id)
        setStatuses((prev) => prev.filter((s) => s.id !== status.id))
      },
    })
  }

  const columns = [
    {
      title: 'Статус',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PersonStatus) => (
        <span style={{
          display: 'inline-block', padding: '2px 12px', borderRadius: 20,
          background: record.color + '22', color: record.color, fontWeight: 600, fontSize: 14,
        }}>
          {name}
        </span>
      ),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: PersonStatus) => (
        <Space>
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/settings/person-statuses/${record.id}`)}
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
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Статуси людей</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/person-statuses/new')}>
          Новий статус
        </Button>
      </div>
      <Table
        dataSource={statuses}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Статусів ще немає' }}
      />
    </div>
  )
}
