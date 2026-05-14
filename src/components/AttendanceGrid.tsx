import { SpinLoading } from 'antd-mobile'
import type { AttendanceRecord, Group } from '@/types'

const DAY_TO_JS: Record<string, number> = {
  'Неділя': 0, 'Понеділок': 1, 'Вівторок': 2, 'Середа': 3,
  'Четвер': 4, "Пʼятниця": 5, 'Субота': 6,
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

interface Props {
  // Either personId or userId — used to filter attendance records
  personId?: number
  userId?: number
  group?: Group
  attendance: AttendanceRecord[]
  loading: boolean
  noGroupMessage?: string
}

export function AttendanceGrid({ personId, userId, group, attendance, loading, noGroupMessage }: Props) {
  const today = new Date()

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const currentYearStartIdx = months.findIndex(m => m.year === today.getFullYear())
  const targetDay = group?.meetingDay != null ? DAY_TO_JS[group.meetingDay] : undefined

  const columns = months.map(({ year, month }) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const records = attendance
      .filter(r => {
        if (!r.meetingDate.startsWith(prefix)) return false
        if (userId != null) return r.userId === userId
        return r.personId === personId
      })
      .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))

    let squares: Array<'present' | 'absent' | 'none'>
    if (records.length > 0) {
      squares = records.map(r => (r.wasPresent ? 'present' : 'absent'))
    } else if (targetDay !== undefined) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const count = Array.from({ length: daysInMonth }, (_, d) =>
        new Date(year, month, d + 1).getDay() === targetDay,
      ).filter(Boolean).length
      squares = Array<'none'>(count).fill('none')
    } else {
      squares = []
    }

    return { year, month, squares }
  })

  const maxRows = Math.max(...columns.map(c => c.squares.length), 1)

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginTop: 16, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={blockLabel}>Відвідуваність</span>
        {loading && <SpinLoading style={{ '--size': '16px' } as React.CSSProperties} color="primary" />}
      </div>

      {!group ? (
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          {noGroupMessage ?? 'Не прив\'язаний до групи'}
        </span>
      ) : (
        <>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 4 }}>
            Сьогодні
          </div>

          <div style={{ display: 'flex', marginBottom: 8, height: 3, borderRadius: 2, overflow: 'hidden' }}>
            {currentYearStartIdx > 0 && <div style={{ flex: currentYearStartIdx }} />}
            <div style={{ flex: 12 - currentYearStartIdx, background: 'var(--color-primary)', borderRadius: 2 }} />
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {columns.map(({ year, month, squares }) => (
              <div key={`${year}-${month}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Array.from({ length: maxRows }, (_, i) => {
                  const s = squares[i]
                  return (
                    <div key={i} style={{
                      aspectRatio: '1', borderRadius: 2,
                      background: s === 'present' ? '#10B981' : s === 'absent' ? '#E5E7EB' : s === 'none' ? '#F3F4F6' : 'transparent',
                      border: s ? `1px solid ${s === 'present' ? '#059669' : '#D1D5DB'}` : 'none',
                    }} />
                  )
                })}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            {([['#10B981', '#059669', 'Був'] as const, ['#E5E7EB', '#D1D5DB', 'Не був'] as const, ['#F3F4F6', '#D1D5DB', 'Немає даних'] as const]).map(([bg, border, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${border}` }} />
                {label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const blockLabel: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
