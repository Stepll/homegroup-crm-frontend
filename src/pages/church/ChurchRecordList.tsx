import { SpinLoading, Dialog } from 'antd-mobile'
import type { ChurchServiceRecord } from '@/api/churchServices'

interface Props {
  records: ChurchServiceRecord[]
  loading: boolean
  hasCommunion: boolean
  canRecord: boolean
  onEdit: (r: ChurchServiceRecord) => void
  onDelete: (id: number) => void
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function ChurchRecordList({ records, loading, hasCommunion, canRecord, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
        <SpinLoading />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 48, fontSize: 14 }}>
        Записів ще немає
      </div>
    )
  }

  const confirmDelete = (id: number) => {
    Dialog.confirm({
      title: 'Видалити запис?',
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      onConfirm: () => onDelete(id),
    })
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {records.map((r) => (
        <div
          key={r.id}
          style={{
            margin: '0 12px 8px',
            background: '#fff',
            borderRadius: 12,
            padding: '12px 14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{fmtDate(r.date)}</div>
            {canRecord && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => onEdit(r)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, padding: 0 }}
                >
                  Редагувати
                </button>
                <button
                  onClick={() => confirmDelete(r.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, padding: 0 }}
                >
                  Видалити
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Присутніх</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>
                {r.attendanceCount}
              </div>
            </div>

            {hasCommunion && r.communionCount != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Причастя</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#8B5CF6' }}>
                  {r.communionCount}
                </div>
              </div>
            )}
          </div>

          {r.notes && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {r.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
