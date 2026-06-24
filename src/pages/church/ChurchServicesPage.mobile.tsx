import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Toast } from 'antd-mobile'
import { churchServicesApi, SERVICE_TYPES, type ChurchServiceRecord, type ServiceType } from '@/api/churchServices'
import { useAuth } from '@/store/auth'
import { ChurchRecordForm } from './ChurchRecordForm'
import { ChurchRecordList } from './ChurchRecordList'

export function ChurchServicesPageMobile() {
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
      Toast.show({ content: 'Помилка завантаження', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeType])

  const handleSaved = () => {
    setFormOpen(false)
    setEditRecord(null)
    load()
  }

  const handleEdit = (r: ChurchServiceRecord) => {
    setEditRecord(r)
    setFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await churchServicesApi.delete(id)
      Toast.show({ content: 'Видалено', icon: 'success' })
      load()
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  const openAdd = () => {
    setEditRecord(null)
    setFormOpen(true)
  }

  const activeTypeMeta = SERVICE_TYPES.find((t) => t.key === activeType)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/church/stats')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 14, padding: 0 }}
            >
              Статистика
            </button>
            {canRecord && (
              <button
                onClick={openAdd}
                style={{
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '4px 12px',
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                + Додати
              </button>
            )}
          </div>
        }
      >
        Служіння
      </NavBar>

      {/* Type tabs */}
      <div style={{ overflowX: 'auto', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {SERVICE_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              style={{
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: activeType === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeType === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeType === t.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ChurchRecordList
          records={records}
          loading={loading}
          hasCommunion={activeTypeMeta.hasCommunion}
          canRecord={canRecord}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {formOpen && (
        <ChurchRecordForm
          serviceType={activeType}
          record={editRecord}
          onClose={() => { setFormOpen(false); setEditRecord(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
