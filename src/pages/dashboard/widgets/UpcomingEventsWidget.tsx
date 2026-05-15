import { useEffect, useState } from 'react'
import { SpinLoading } from 'antd-mobile'
import { useAuth } from '@/store/auth'
import { groupsApi } from '@/api/groups'
import type { GroupEvent, GroupCabinet } from '@/types'

export function UpcomingEventsWidget() {
  const { user } = useAuth()
  const groupId = user?.primaryGroupId

  const [upcomingBirthdays, setUpcomingBirthdays] = useState<GroupCabinet['upcomingEvents']>([])
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) { setLoading(false); return }
    Promise.all([
      groupsApi.getCabinet(groupId),
      groupsApi.getEvents(groupId),
    ]).then(([cabinet, evts]) => {
      setUpcomingBirthdays(cabinet.upcomingEvents)
      setEvents(evts)
    }).finally(() => setLoading(false))
  }, [groupId])

  if (!groupId) {
    return (
      <div style={widgetWrap}>
        <div style={sectionLabel}>Найближчі події</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Не прив'язано до жодної групи
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={widgetWrap}>
        <div style={sectionLabel}>Найближчі події</div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <SpinLoading color="primary" style={{ '--size': '20px' } as React.CSSProperties} />
        </div>
      </div>
    )
  }

  const hasAnything = upcomingBirthdays.length > 0 || events.length > 0

  return (
    <div style={widgetWrap}>
      <div style={sectionLabel}>Найближчі події</div>

      {!hasAnything && (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
          Немає запланованих подій
        </div>
      )}

      {/* Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcomingBirthdays.map((ev) => (
            <div key={ev.personId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>🎂 {ev.fullName}</span>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {formatBirthday(ev.dateOfBirth)}
                </div>
              </div>
              <span style={{ fontSize: 12, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', fontWeight: 600 }}>
                {ev.daysUntil === 0 ? 'Сьогодні!' : `за ${ev.daysUntil} дн.`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Divider between sections */}
      {upcomingBirthdays.length > 0 && events.length > 0 && (
        <div style={{ height: 1, background: 'var(--color-border-light)', margin: '10px 0' }} />
      )}

      {/* Custom events */}
      {events.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {events.map((ev) => (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 8px', borderRadius: 8,
              background: ev.daysUntil <= 7 ? 'rgba(52, 199, 89, 0.08)' : 'transparent',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{ev.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                  {formatEventDate(ev.month, ev.day)}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                {ev.daysUntil === 0 ? 'Сьогодні!' : ev.daysUntil === 1 ? 'Завтра' : `за ${ev.daysUntil} дн.`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatBirthday(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

function formatEventDate(month: number, day: number) {
  return new Date(2000, month - 1, day).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
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
