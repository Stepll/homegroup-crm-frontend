import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SpinLoading } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import { attendanceApi, type AttendanceDotsResponse } from '@/api/attendance'
import type { GroupMember } from '@/types'

type Dot = { color: 'green' | 'red' | 'yellow'; date: string }

const DOT_COLORS: Record<Dot['color'], string> = {
  green: '#22C55E', red: '#EF4444', yellow: '#F59E0B',
}

export function MyOversightWidget() {
  const navigate = useNavigate()
  const [people, setPeople] = useState<GroupMember[]>([])
  const [dotsByPerson, setDotsByPerson] = useState<Record<number, Dot[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    peopleApi.getAll(undefined, undefined, false, true)
      .then(setPeople)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (people.length === 0) return
    const groupIds = [...new Set(people.map((p) => p.primaryGroupId).filter((id): id is number => id != null))]
    Promise.all(
      groupIds.map((gid) =>
        attendanceApi.getDots(gid).then((r) => ({ gid, r }))
      )
    ).then((results) => {
      const map: Record<number, Dot[]> = {}
      for (const { gid, r }: { gid: number; r: AttendanceDotsResponse } of results) {
        const cancelled = new Set(r.cancelledDates)
        const recordMap = new Map<string, boolean>()
        for (const rec of r.records) {
          if (rec.personId == null) continue
          recordMap.set(`${rec.personId}_${rec.date}`, rec.wasPresent)
        }
        const sortedDates = [...r.dates].reverse()
        for (const person of people.filter((p) => p.primaryGroupId === gid && !p.isAdmin)) {
          map[person.id] = sortedDates.slice(0, 5).map((date) => {
            if (cancelled.has(date)) return { color: 'yellow' as const, date }
            const wasPresent = recordMap.get(`${person.id}_${date}`)
            return { color: wasPresent === true ? 'green' as const : 'red' as const, date }
          })
        }
      }
      setDotsByPerson(map)
    }).catch(() => {})
  }, [people])

  return (
    <div style={widgetWrap}>
      <div style={sectionLabel}>Мої підопічні</div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <SpinLoading color="primary" style={{ '--size': '20px' } as React.CSSProperties} />
        </div>
      ) : people.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Немає людей під твоєю опікою
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6, maxHeight: 320, overflowY: 'auto' }}>
          {people.map((p) => {
            const dots = dotsByPerson[p.id] ?? []
            const fullName = [p.name, p.lastName].filter(Boolean).join(' ')
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/people/${p.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 4px', borderBottom: '1px solid var(--color-border-light)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fullName}
                  </span>
                  {p.primaryGroupName && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                      {p.primaryGroupName}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 8 }}>
                  {dots.length > 0
                    ? dots.map((d, i) => (
                        <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: DOT_COLORS[d.color] }} />
                      ))
                    : <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}
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
