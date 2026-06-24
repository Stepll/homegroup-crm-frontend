import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, Button, message, Popconfirm, Table, Typography, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { churchServicesApi, SERVICE_TYPES, type ChurchServiceRecord, type ServiceType } from '@/api/churchServices'
import { useAuth } from '@/store/auth'
import { ChurchRecordFormDesktop } from './ChurchRecordFormDesktop'

const { Title } = Typography

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function ChurchServicesPageDesktop() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRecord = hasPermission('church.attendance.record')

  const [activeType, setActiveType] = useState<ServiceType>('sunday_1')
  const [records, setRecords] = useState<ChurchServiceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ChurchServiceRecord | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await churchServicesApi.getAll({ type: activeType })
      setRecords(data)
    } catch {
      message.error('Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeType])

  const handleDelete = async (id: number) => {
    try {
      await churchServicesApi.delete(id)
      message.success('Видалено')
      load()
    } catch {
      message.error('Помилка видалення')
    }
  }

  const handleExport = async () => {
    try {
      const blob = await churchServicesApi.export({ type: activeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `church-services-${activeType}-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Помилка експорту')
    }
  }

  const activeTypeMeta = SERVICE_TYPES.find((t) => t.key === activeType)!

  const columns: ColumnsType<ChurchServiceRecord> = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (v: string) => fmtDate(v),
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Присутніх',
      dataIndex: 'attendanceCount',
      key: 'attendanceCount',
      render: (v: number) => <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{v}</span>,
    },
    ...(activeTypeMeta.hasCommunion ? [{
      title: 'Причастя',
      dataIndex: 'communionCount',
      key: 'communionCount',
      render: (v: number | null) => v != null ? <span style={{ fontWeight: 600, color: '#8B5CF6' }}>{v}</span> : '—',
    }] : []),
    {
      title: 'Нотатки',
      dataIndex: 'notes',
      key: 'notes',
      render: (v: string | null) => v ?? '—',
    },
    ...(canRecord ? [{
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, r: ChurchServiceRecord) => (
        <Space>
          <Button size="small" onClick={() => { setEditRecord(r); setFormOpen(true) }}>Редагувати</Button>
          <Popconfirm title="Видалити запис?" okText="Видалити" cancelText="Скасувати" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>Видалити</Button>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Служіння</Title>
        <Space>
          <Button onClick={() => navigate('/church/stats')}>Статистика</Button>
          <Button onClick={handleExport}>Експорт Excel</Button>
          {canRecord && (
            <Button type="primary" onClick={() => { setEditRecord(null); setFormOpen(true) }}>
              + Додати
            </Button>
          )}
        </Space>
      </div>

      <Tabs
        activeKey={activeType}
        onChange={(key) => setActiveType(key as ServiceType)}
        items={SERVICE_TYPES.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        style={{ marginTop: 8 }}
      />

      {formOpen && (
        <ChurchRecordFormDesktop
          serviceType={activeType}
          record={editRecord}
          onClose={() => { setFormOpen(false); setEditRecord(null) }}
          onSaved={() => { setFormOpen(false); setEditRecord(null); load() }}
        />
      )}
    </div>
  )
}
