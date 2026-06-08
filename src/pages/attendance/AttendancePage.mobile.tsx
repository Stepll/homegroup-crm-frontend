import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { NavBar, Button, Toast, SpinLoading } from 'antd-mobile'
import { CheckCircleOutline, CloseCircleOutline } from 'antd-mobile-icons'
import { groupsApi } from '@/api/groups'
import { attendanceApi } from '@/api/attendance'
import { calendarApi } from '@/api/calendar'
import type { GroupMember } from '@/types'

function memberKey(m: GroupMember) {
  return m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
}

export function AttendancePageMobile() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(
    searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  )
  const [guestCount, setGuestCount] = useState(0)
  const [guestInfo, setGuestInfo] = useState('')
  const [showGuestInfo, setShowGuestInfo] = useState(false)
  const initialDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const [meetingDates, setMeetingDates] = useState<string[]>([initialDate])

  useEffect(() => {
    groupsApi.getMembers(Number(id))
      .then((m) => setMembers(m.filter(member => !member.isFormer)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const initDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
    const datesP = attendanceApi.getMeetingDates(Number(id)).catch(() => [] as string[])
    const today = new Date().toISOString().split('T')[0]
    const eightWeeksAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 56); return d.toISOString().split('T')[0] })()
    const calP = calendarApi.getOccurrences({ from: eightWeeksAgo, to: today, types: 'HomeGroup', groupIds: String(id) }).catch(() => [])
    Promise.all([datesP, calP]).then(([fromDb, occurrences]) => {
      const fromCalendar = occurrences.filter(o => o.homeGroupId === Number(id)).map(o => o.date)
      // fromDb takes priority — calendar fills only weeks with no DB records
      const dbWeeks = new Set(fromDb.map(weekKey))
      const calendarFill = fromCalendar.filter(d => !dbWeeks.has(weekKey(d)))
      const merged = Array.from(new Set([...fromDb, ...calendarFill, initDate]))
        .sort((a, b) => b.localeCompare(a))
      setMeetingDates(merged)
    })
  }, [id])

  // Pre-populate present set from already-saved attendance when date changes
  useEffect(() => {
    attendanceApi.getByGroup(Number(id), date, date).then((records) => {
      const keys = new Set<string>(
        records
          .filter((r) => r.wasPresent)
          .map((r) => r.userId != null ? `u_${r.userId}` : `p_${r.personId}`)
      )
      setPresent(keys)
    }).catch(() => setPresent(new Set()))
  }, [id, date])

  useEffect(() => {
    attendanceApi.getMeta(Number(id), date).then((meta) => {
      setGuestCount(meta.guestCount)
      setGuestInfo(meta.guestInfo ?? '')
      setShowGuestInfo(!!meta.guestInfo)
    }).catch(() => {
      setGuestCount(0)
      setGuestInfo('')
    })
  }, [id, date])

  const toggle = (m: GroupMember) => {
    const key = memberKey(m)
    setPresent((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const markAll = (value: boolean) => {
    setPresent(value ? new Set(members.map(memberKey)) : new Set())
  }

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all([
        attendanceApi.record({
          homeGroupId: Number(id),
          meetingDate: date,
          entries: members.map((m) => ({
            personId: m.isAdmin ? undefined : m.id,
            userId: m.isAdmin ? m.userId : undefined,
            wasPresent: present.has(memberKey(m)),
          })),
        }),
        attendanceApi.saveMeta({
          homeGroupId: Number(id),
          meetingDate: date,
          guestCount,
          guestInfo: guestInfo.trim() || undefined,
          isCancelled: false,
        }),
      ])
      Toast.show({ content: 'Збережено!', icon: 'success' })
      navigate(`/cabinet/${id}`)
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
        <SpinLoading color="primary" />
      </div>
    )
  }

  const presentCount = present.size
  const totalCount = members.length
  const pct = totalCount > 0 ? Math.round(presentCount * 100 / totalCount) : 0
  const allPresent = presentCount === totalCount

  return (
    <div style={{ paddingBottom: 100 }}>
      <NavBar onBack={() => navigate(-1)}>Відвідуваність</NavBar>

      {/* Summary bar */}
      <div style={{ padding: '12px 16px 14px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 14, color: 'var(--color-text-secondary)', background: 'transparent', cursor: 'pointer', maxWidth: 200 }}
          >
            {meetingDates.map((d) => (
              <option key={d} value={d}>{formatMeetingDate(d)}</option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>{presentCount}</span>
            <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>/{totalCount}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{pct}%</span>
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--color-border-light)', borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 3, transition: 'width 0.15s' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => markAll(true)} style={quickBtn}>Всі присутні</button>
          <button onClick={() => markAll(false)} style={quickBtn}>Всі відсутні</button>
        </div>
      </div>

      {/* Guests */}
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Гості</span>
          <input
            type="number"
            min={0}
            value={guestCount === 0 ? '' : guestCount}
            placeholder="0"
            onChange={(e) => setGuestCount(Math.max(0, Number(e.target.value) || 0))}
            style={{
              width: 64, border: '1.5px solid var(--color-border)', borderRadius: 8,
              padding: '6px 10px', fontSize: 15, background: 'var(--color-bg)',
              color: 'var(--color-text)', outline: 'none', textAlign: 'center',
            }}
          />
        </div>
        <button
          onClick={() => setShowGuestInfo((v) => !v)}
          style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {showGuestInfo ? 'Приховати' : 'Вказати інформацію про гостей'}
        </button>
        {showGuestInfo && (
          <textarea
            value={guestInfo}
            onChange={(e) => setGuestInfo(e.target.value)}
            placeholder="Імена, контакти або нотатки про гостей..."
            rows={3}
            style={{
              display: 'block', width: '100%', marginTop: 8,
              border: '1.5px solid var(--color-border)', borderRadius: 8,
              padding: '8px 10px', fontSize: 14, background: 'var(--color-bg)',
              color: 'var(--color-text)', outline: 'none', resize: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {/* Member list */}
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.map((m) => {
          const key = memberKey(m)
          const isPresent = present.has(key)
          const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
          return (
            <button
              key={key}
              onClick={() => toggle(m)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                background: isPresent ? 'rgba(34,197,94,0.07)' : '#fff',
                border: `1.5px solid ${isPresent ? 'rgba(34,197,94,0.3)' : 'var(--color-border-light)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.12s, border-color 0.12s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: isPresent ? '#16a34a' : 'var(--color-text)' }}>
                  {fullName}
                </span>
                {m.isAdmin && m.roleTag && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 6px',
                    color: m.roleTag.color, background: `${m.roleTag.color}18`,
                  }}>
                    {m.roleTag.name}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 22, color: isPresent ? '#22c55e' : 'var(--color-border)', display: 'flex' }}>
                {isPresent ? <CheckCircleOutline /> : <CloseCircleOutline />}
              </span>
            </button>
          )
        })}
      </div>

      {/* Fixed save button */}
      <div style={{
        position: 'fixed', bottom: 'calc(58px + env(safe-area-inset-bottom))', left: 0, right: 0,
        padding: '12px 16px',
        background: '#fff',
        boxShadow: '0 -1px 0 var(--color-border-light), 0 -4px 12px rgba(0,0,0,0.06)',
      }}>
        <Button block color="primary" size="large" loading={saving} onClick={save}>
          {allPresent ? `Всі присутні (${presentCount})` : `Зберегти · ${presentCount} з ${totalCount}`}
        </Button>
      </div>
    </div>
  )
}

function weekKey(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d); mon.setDate(diff)
  return mon.toISOString().split('T')[0]
}

function formatMeetingDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short', year: 'numeric' })
}

const quickBtn: React.CSSProperties = {
  flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
  borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: 12,
  color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 500,
  WebkitTapHighlightColor: 'transparent',
}
