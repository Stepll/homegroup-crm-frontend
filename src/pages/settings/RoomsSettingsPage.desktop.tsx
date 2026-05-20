import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Modal, Typography, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { roomsApi } from '@/api/calendar'
import type { Room } from '@/types'

const { Title } = Typography

const BUILDING_LABELS: Record<string, string> = {
  Church: 'Церква',
  SocialCenter: 'Соц. центр',
}

export function RoomsSettingsPageDesktop() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    roomsApi.getAll()
      .then(setRooms)
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = (room: Room) => {
    Modal.confirm({
      title: 'Видалити кімнату?',
      content: `"${room.name}" буде видалено.`,
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await roomsApi.delete(room.id)
        setRooms((prev) => prev.filter((r) => r.id !== room.id))
      },
    })
  }

  const columns = [
    {
      title: 'Кімната',
      key: 'name',
      render: (_: unknown, record: Room) => (
        <Space>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: record.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontWeight: 500 }}>{record.name}</span>
        </Space>
      ),
    },
    {
      title: 'Приміщення',
      dataIndex: 'building',
      key: 'building',
      width: 140,
      render: (b: string) => BUILDING_LABELS[b] ?? b,
    },
    {
      title: 'Поверх',
      dataIndex: 'floor',
      key: 'floor',
      width: 90,
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 90,
      render: (_: unknown, record: Room) => (
        <Space>
          <Button
            type="text" size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/settings/rooms/${record.id}`)}
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
        <Title level={3} style={{ margin: 0 }}>Кімнати для бронювання</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/rooms/new')}>
          Нова кімната
        </Button>
      </div>
      <Table
        dataSource={rooms}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'Кімнат ще немає' }}
      />
    </div>
  )
}
