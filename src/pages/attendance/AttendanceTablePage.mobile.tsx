import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Toast, SpinLoading, Popup, Button, Switch, Dialog } from 'antd-mobile'
import { MoreOutline } from 'antd-mobile-icons'
import { attendanceApi } from '@/api/attendance'
import { usePermissions } from '@/hooks/usePermission'
import { AttendanceImportExportPopup } from '@/components/AttendanceImportExportPopup'
import type { AttendanceTableMember, AttendanceTableResponse } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL_W = 44
const NAME_W = 120
const ROW_H = 44
const HEADER_H = 56
const STATS_H = 36

// ─── Helpers ─────────────────────────────────────────────────────────────────

function memberKey(m: AttendanceTableMember) {
  return m.userId != null ? `u_${m.userId}` : `p_${m.personId}`
}

function formatColDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDate()
  const month = d.toLocaleDateString('uk-UA', { month: 'short' }).replace('.', '')
  return { day, month }
}

function formatSheetDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
}

function isFuture(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(iso + 'T00:00:00') > today
}

// Deep clone for tracking dirty state
function cloneTable(data: AttendanceTableResponse) {
  return {
    attendance: data.members.reduce<Record<string, Record<string, boolean>>>((acc, m) => {
      acc[memberKey(m)] = { ...m.attendance }
      return acc
    }, {}),
    meetings: data.meetings.reduce<Record<string, { guestCount: number; guestInfo: string; notes: string; isCancelled: boolean }>>((acc, mt) => {
      acc[mt.date] = {
        guestCount: mt.guestCount,
        guestInfo: mt.guestInfo ?? '',
        notes: mt.notes ?? '',
        isCancelled: mt.isCancelled,
      }
      return acc
    }, {}),
  }
}

type TableState = ReturnType<typeof cloneTable>

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendanceTablePageMobile() {
  const { id } = useParams<{ id: string }>()
  const groupId = Number(id)
  const navigate = useNavigate()
  const perms = usePermissions(['people.view', 'admins.viewProfiles'])

  const [data, setData] = useState<AttendanceTableResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Mutable state for edits
  const [current, setCurrent] = useState<TableState | null>(null)
  const originalRef = useRef<TableState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Bottom sheet state
  const [colSheet, setColSheet] = useState<string | null>(null) // date string

  // Import/Export popup
  const [ioOpen, setIoOpen] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      const d = await attendanceApi.getTable(groupId)
      setData(d)
      const state = cloneTable(d)
      setCurrent(state)
      originalRef.current = cloneTable(d)
    } finally {
      setLoading(false)
    }
  }

  // Temp fields inside column sheet
  const [sheetNotes, setSheetNotes] = useState('')
  const [sheetCancelled, setSheetCancelled] = useState(false)
  const [sheetGuestCount, setSheetGuestCount] = useState(0)
  const [sheetGuestInfo, setSheetGuestInfo] = useState('')

  useEffect(() => {
    attendanceApi.getTable(groupId)
      .then((d) => {
        setData(d)
        const state = cloneTable(d)
        setCurrent(state)
        originalRef.current = cloneTable(d)
        // Scroll to rightmost (most recent) column after render
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
        })
      })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }, [groupId])

  const isDirty = current !== null && originalRef.current !== null &&
    JSON.stringify(current) !== JSON.stringify(originalRef.current)

  // ── Cell toggle ──────────────────────────────────────────────────────────
  function toggleCell(memberK: string, date: string) {
    setCurrent((prev) => {
      if (!prev) return prev
      const att = prev.attendance[memberK] ?? {}
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [memberK]: { ...att, [date]: !att[date] },
        },
      }
    })
  }

  // ── Column sheet ─────────────────────────────────────────────────────────
  function openColSheet(date: string) {
    const mt = current?.meetings[date]
    setSheetNotes(mt?.notes ?? '')
    setSheetCancelled(mt?.isCancelled ?? false)
    setSheetGuestCount(mt?.guestCount ?? 0)
    setSheetGuestInfo(mt?.guestInfo ?? '')
    setColSheet(date)
  }

  function applyColSheet() {
    if (!colSheet || !current) return
    setCurrent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        meetings: {
          ...prev.meetings,
          [colSheet]: {
            ...prev.meetings[colSheet],
            notes: sheetNotes,
            isCancelled: sheetCancelled,
            guestCount: sheetGuestCount,
            guestInfo: sheetGuestInfo,
          },
        },
      }
    })
    setColSheet(null)
  }

  async function handleDeleteMeeting() {
    if (!colSheet) return
    const confirmed = await Dialog.confirm({
      content: `Видалити зустріч ${formatSheetDate(colSheet)} з бази?`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await attendanceApi.deleteMeeting(groupId, colSheet)
      Toast.show({ content: 'Зустріч видалена', icon: 'success' })
      setColSheet(null)
      // Reload
      setLoading(true)
      const d = await attendanceApi.getTable(groupId)
      setData(d)
      const state = cloneTable(d)
      setCurrent(state)
      originalRef.current = cloneTable(d)
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  // ── Save all ─────────────────────────────────────────────────────────────
  async function save() {
    if (!current || !data) return
    setSaving(true)
    try {
      // Build bulk attendance entries for changed cells
      const entries: { date: string; personId?: number; userId?: number; wasPresent: boolean }[] = []

      for (const m of data.members) {
        const key = memberKey(m)
        const orig = originalRef.current?.attendance[key] ?? {}
        const cur = current.attendance[key] ?? {}

        for (const date of data.dates) {
          // Only send if in the member's active range (key exists in cur)
          if (!(date in cur)) continue
          if (orig[date] !== cur[date]) {
            entries.push({
              date,
              personId: m.personId ?? undefined,
              userId: m.userId ?? undefined,
              wasPresent: cur[date],
            })
          }
        }
      }

      // Build changed meta dates
      const changedMeta = data.dates.filter((date) => {
        const orig = originalRef.current?.meetings[date]
        const cur = current.meetings[date]
        if (!orig && !cur) return false
        return (
          (orig?.guestCount ?? 0) !== (cur?.guestCount ?? 0) ||
          (orig?.guestInfo ?? '') !== (cur?.guestInfo ?? '') ||
          (orig?.notes ?? '') !== (cur?.notes ?? '') ||
          (orig?.isCancelled ?? false) !== (cur?.isCancelled ?? false)
        )
      })

      await Promise.all([
        entries.length > 0
          ? attendanceApi.recordBulk({ homeGroupId: groupId, entries })
          : Promise.resolve(),
        ...changedMeta.map((date) =>
          attendanceApi.saveMeta({
            homeGroupId: groupId,
            meetingDate: date,
            guestCount: current.meetings[date]?.guestCount ?? 0,
            guestInfo: current.meetings[date]?.guestInfo || undefined,
            notes: current.meetings[date]?.notes || undefined,
            isCancelled: current.meetings[date]?.isCancelled ?? false,
          })
        ),
      ])

      // Refresh to get updated rates
      const d = await attendanceApi.getTable(groupId)
      setData(d)
      const state = cloneTable(d)
      setCurrent(state)
      originalRef.current = cloneTable(d)

      Toast.show({ content: 'Збережено!', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    if (originalRef.current) {
      setCurrent(JSON.parse(JSON.stringify(originalRef.current)))
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading || !data || !current) {
    return (
      <>
        <NavBar onBack={() => navigate(-1)}>Таблиця відвідуваності</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading color="primary" />
        </div>
      </>
    )
  }

  const { dates, meetings, members } = data

  const totalW = NAME_W + dates.length * CELL_W

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <button
            onClick={() => setIoOpen(true)}
            style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex' }}
            aria-label="Імпорт / Експорт"
          >
            <MoreOutline fontSize={22} />
          </button>
        }
      >Таблиця відвідуваності</NavBar>

      {/* ── Scrollable table area ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', paddingBottom: isDirty ? 72 : 0 }}>
        <div ref={scrollRef} style={{ height: '100%', overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: totalW, minWidth: '100%', position: 'relative' }}>

            {/* ── HEADER ROW: date columns ── */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: '#fff', borderBottom: '2px solid var(--color-border)' }}>
              {/* Name column header */}
              <div style={stickyNameCell(HEADER_H, true)}>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Ім'я / %</span>
              </div>

              {/* Date headers */}
              {dates.map((date) => {
                const { day, month } = formatColDate(date)
                const mt = meetings.find((m) => m.date === date)
                const isCancelled = current.meetings[date]?.isCancelled ?? false
                return (
                  <button
                    key={date}
                    onClick={() => openColSheet(date)}
                    style={{
                      ...colHeaderBtn,
                      width: CELL_W,
                      height: HEADER_H,
                      background: isCancelled ? '#FEF9C3' : '#fff',
                      borderLeft: '1px solid var(--color-border-light)',
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, color: isCancelled ? '#92400e' : 'var(--color-text)' }}>{day}</span>
                    <span style={{ fontSize: 10, color: isCancelled ? '#a16207' : 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{month}</span>
                    {mt?.notes && <span style={{ fontSize: 7, color: 'var(--color-primary)', marginTop: 1 }}>●</span>}
                  </button>
                )
              })}
            </div>

            {/* ── GUESTS ROW ── */}
            <div style={{ display: 'flex', position: 'sticky', top: HEADER_H, zIndex: 19, background: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ ...stickyNameCell(STATS_H, false), background: '#F8FAFC' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Гості</span>
              </div>
              {dates.map((date) => {
                const isCancelled = current.meetings[date]?.isCancelled ?? false
                const count = current.meetings[date]?.guestCount ?? 0
                return (
                  <button
                    key={date}
                    onClick={() => openColSheet(date)}
                    style={{
                      ...statCell(CELL_W, STATS_H),
                      background: isCancelled ? '#FEF9C3' : '#F8FAFC',
                      color: count > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                      fontWeight: count > 0 ? 700 : 400,
                    }}
                  >
                    {isCancelled ? '—' : (count > 0 ? count : '·')}
                  </button>
                )
              })}
            </div>

            {/* ── TOTAL ROW ── */}
            <div style={{ display: 'flex', position: 'sticky', top: HEADER_H + STATS_H, zIndex: 18, background: '#F8FAFC', borderBottom: '2px solid var(--color-border)' }}>
              <div style={{ ...stickyNameCell(STATS_H, false), background: '#F8FAFC' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Всього</span>
              </div>
              {dates.map((date) => {
                const isCancelled = current.meetings[date]?.isCancelled ?? false
                const count = isCancelled ? null : members.reduce((n, m) => {
                  const key = memberKey(m)
                  const att = current.attendance[key] ?? {}
                  if (!(date in att)) return n
                  if (date < m.joinedAt || (!!m.leftAt && date > m.leftAt)) return n
                  return n + (att[date] ? 1 : 0)
                }, 0)
                return (
                  <div key={date} style={{
                    ...statCell(CELL_W, STATS_H),
                    background: isCancelled ? '#FEF9C3' : '#F8FAFC',
                    color: isCancelled ? '#a16207' : (count ?? 0) > 0 ? 'var(--color-text)' : 'var(--color-text-tertiary)',
                    fontWeight: 600,
                  }}>
                    {isCancelled ? '—' : (count ?? '·')}
                  </div>
                )
              })}
            </div>

            {/* ── MEMBER ROWS — active first, former at bottom ── */}
            {(() => {
              const sorted = [...members].sort((a, b) => (a.leftAt ? 1 : 0) - (b.leftAt ? 1 : 0))
              const firstFormerIdx = sorted.findIndex(m => !!m.leftAt)
              return sorted.map((m, rowIdx) => {
              const key = memberKey(m)
              const att = current.attendance[key] ?? {}
              const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
              const rate = m.attendanceRate
              const isFormer = !!m.leftAt
              const showDivider = rowIdx === firstFormerIdx && firstFormerIdx > 0
              return (
                <React.Fragment key={key}>
                  {showDivider && <div style={{ height: 3, background: '#111827' }} />}
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--color-border-light)',
                    background: rowIdx % 2 === 0 ? '#fff' : '#FAFAFA',
                  }}
                >
                  {/* Sticky name cell */}
                  <div style={{
                    ...stickyNameCell(ROW_H, false),
                    height: 'auto',
                    background: rowIdx % 2 === 0 ? '#fff' : '#FAFAFA',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0,
                    padding: '4px 8px 4px 12px',
                    borderRight: isFormer ? '2px solid #FECACA' : undefined,
                  }}>
                    <span
                      onClick={() => {
                        if (m.userId != null && perms['admins.viewProfiles']) navigate(`/admins/${m.userId}`)
                        else if (m.personId != null && perms['people.view']) navigate(`/people/${m.personId}`)
                      }}
                      style={{ fontSize: 12, fontWeight: 600, color: isFormer ? '#DC2626' : 'var(--color-text)', lineHeight: 1.2, maxWidth: NAME_W - 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: (m.userId != null && perms['admins.viewProfiles']) || (m.personId != null && perms['people.view']) ? 'pointer' : 'default' }}
                    >
                      {fullName}
                    </span>
                    <span style={{ fontSize: 10, color: rate >= 70 ? '#16a34a' : rate >= 40 ? '#d97706' : 'var(--color-error)' }}>
                      {rate}%
                    </span>
                  </div>

                  {/* Attendance cells */}
                  {dates.map((date) => {
                    const isCancelled = current.meetings[date]?.isCancelled ?? false
                    if (isCancelled) return <div key={date} style={disabledCell(CELL_W, true)} />
                    const outsidePeriod = date < m.joinedAt || (!!m.leftAt && date > m.leftAt)
                    if (outsidePeriod) return <div key={date} style={disabledCell(CELL_W, false)} />
                    const hasData = date in att
                    if (!hasData) return <button key={date} onClick={() => toggleCell(key, date)} style={noDataCell(CELL_W)} />
                    return <button key={date} onClick={() => toggleCell(key, date)} style={attendanceCell(CELL_W, att[date])} />
                  })}
                </div>
                </React.Fragment>
              )
              })
            })()}

          </div>
        </div>
      </div>

      {/* ── Save/Cancel bar (only when dirty) ── */}
      {isDirty && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(58px + env(safe-area-inset-bottom))',
          left: 0, right: 0,
          display: 'flex', gap: 10, padding: '12px 16px',
          background: '#fff',
          boxShadow: '0 -1px 0 var(--color-border-light), 0 -4px 12px rgba(0,0,0,0.06)',
          zIndex: 100,
        }}>
          <Button
            fill="outline" size="large"
            style={{ flex: 1 }}
            onClick={cancel}
            disabled={saving}
          >
            Скасувати
          </Button>
          <Button
            color="primary" size="large"
            style={{ flex: 2 }}
            loading={saving}
            onClick={save}
          >
            Зберегти зміни
          </Button>
        </div>
      )}

      {/* ── Column bottom sheet ── */}
      <Popup
        visible={colSheet !== null}
        onMaskClick={applyColSheet}
        position="bottom"
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        {colSheet && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>
              {formatSheetDate(colSheet)}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={sheetLabel}>Нотатки до зустрічі</label>
              <textarea
                value={sheetNotes}
                onChange={(e) => setSheetNotes(e.target.value)}
                placeholder="Тема, особливості, нагадування..."
                rows={3}
                style={textareaStyle}
              />
            </div>

            {/* Guest count */}
            <div style={{ marginBottom: 16 }}>
              <label style={sheetLabel}>Гості</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <button onClick={() => setSheetGuestCount((n) => Math.max(0, n - 1))} style={stepBtn}>−</button>
                <span style={{ fontSize: 22, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{sheetGuestCount}</span>
                <button onClick={() => setSheetGuestCount((n) => n + 1)} style={stepBtn}>+</button>
              </div>
              {sheetGuestCount > 0 && (
                <textarea
                  value={sheetGuestInfo}
                  onChange={(e) => setSheetGuestInfo(e.target.value)}
                  placeholder="Імена або контакти гостей..."
                  rows={2}
                  style={{ ...textareaStyle, marginTop: 8 }}
                />
              )}
            </div>

            {/* Cancelled toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 0', borderTop: '1px solid var(--color-border-light)', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Зустріч скасована</span>
              <Switch
                checked={sheetCancelled}
                onChange={(v) => setSheetCancelled(v)}
                style={{ '--checked-color': '#F59E0B' } as React.CSSProperties}
              />
            </div>

            {/* Delete (future only) */}
            {isFuture(colSheet) && (
              <button
                onClick={handleDeleteMeeting}
                style={{ width: '100%', background: 'none', border: 'none', padding: '10px 0', fontSize: 14, color: 'var(--color-error)', cursor: 'pointer', textAlign: 'center', marginBottom: 12 }}
              >
                Видалити зустріч з бази
              </button>
            )}

            <Button block color="primary" size="large" onClick={applyColSheet}>
              Готово
            </Button>
          </div>
        )}
      </Popup>

      <AttendanceImportExportPopup
        visible={ioOpen}
        onClose={() => setIoOpen(false)}
        defaultGroupId={groupId}
        onImported={reload}
      />
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function stickyNameCell(h: number, isHeader: boolean): React.CSSProperties {
  return {
    position: 'sticky',
    left: 0,
    zIndex: isHeader ? 21 : 10,
    width: NAME_W,
    minWidth: NAME_W,
    height: h,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 8px 0 12px',
    borderRight: '2px solid var(--color-border)',
    background: isHeader ? '#fff' : undefined,
    flexShrink: 0,
  }
}

function attendanceCell(w: number, present: boolean): React.CSSProperties {
  return {
    width: w,
    minWidth: w,
    flexShrink: 0,
    background: present ? '#DCFCE7' : '#FEE2E2',
    border: 'none',
    borderLeft: `1px solid ${present ? '#BBF7D0' : '#FECACA'}`,
    borderBottom: `1px solid ${present ? '#BBF7D0' : '#FECACA'}`,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
    transition: 'background 0.1s',
  }
}

function disabledCell(w: number, isCancelled: boolean): React.CSSProperties {
  return {
    width: w,
    minWidth: w,
    flexShrink: 0,
    background: isCancelled ? '#FEF9C3' : '#E5E7EB',
    borderLeft: `1px solid ${isCancelled ? '#FDE68A' : '#D1D5DB'}`,
    borderBottom: '1px solid var(--color-border-light)',
  }
}

function noDataCell(w: number): React.CSSProperties {
  return {
    width: w,
    minWidth: w,
    flexShrink: 0,
    background: '#F3F4F6',
    border: 'none',
    borderLeft: '1px solid #E5E7EB',
    borderBottom: '1px solid var(--color-border-light)',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  }
}

const colHeaderBtn: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  flexShrink: 0,
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  WebkitTapHighlightColor: 'transparent',
  padding: 0,
}

function statCell(w: number, h: number): React.CSSProperties {
  return {
    width: w,
    minWidth: w,
    height: h,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 500,
    borderLeft: '1px solid var(--color-border-light)',
    border: 'none',
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: 'var(--color-border-light)',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  }
}

const sheetLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
  display: 'block',
}

const textareaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: '1.5px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  outline: 'none',
  resize: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const stepBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: '1.5px solid var(--color-border)',
  background: '#fff',
  fontSize: 22,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text)',
  WebkitTapHighlightColor: 'transparent',
}
