import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, SpinLoading } from 'antd-mobile'
import { useAuth } from '@/store/auth'
import { groupsApi } from '@/api/groups'
import type { GroupCabinet } from '@/types'

export function AttendanceWidget() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const groupId = user?.primaryGroupId

  const [cabinet, setCabinet] = useState<GroupCabinet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) { setLoading(false); return }
    groupsApi.getCabinet(groupId)
      .then(setCabinet)
      .finally(() => setLoading(false))
  }, [groupId])

  if (!groupId) {
    return (
      <div style={widgetWrap}>
        <div style={sectionLabel}>Присутність</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Не прив'язано до жодної групи
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={widgetWrap}>
        <div style={sectionLabel}>Присутність</div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <SpinLoading color="primary" style={{ '--size': '20px' } as React.CSSProperties} />
        </div>
      </div>
    )
  }

  const { lastMeetingDate, lastAttendance } = cabinet ?? {}
  const attendancePct = lastAttendance
    ? Math.round(lastAttendance.present * 100 / (lastAttendance.total || 1))
    : null

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })

  return (
    <div style={widgetWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={sectionLabel}>Присутність</div>
          {lastMeetingDate
            ? <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Остання: {formatDate(lastMeetingDate)}</span>
            : <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Немає зустрічей</span>
          }
          {lastAttendance && (
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
              {lastAttendance.present}/{lastAttendance.total}
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
                {attendancePct}%
              </span>
            </div>
          )}
        </div>
        {lastMeetingDate && (
          <Button
            size="small"
            fill="solid"
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
            onClick={() => navigate(`/cabinet/${groupId}/attendance?date=${lastMeetingDate}`)}
          >
            Відмітити
          </Button>
        )}
      </div>
    </div>
  )
}

const widgetWrap: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  marginBottom: 12,
  boxShadow: 'var(--shadow-sm)',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
}
