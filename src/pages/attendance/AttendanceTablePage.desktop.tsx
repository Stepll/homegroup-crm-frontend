import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Typography, Space, Modal, Switch, InputNumber, Input, Spin } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { attendanceApi } from '@/api/attendance'
import { usePermissions } from '@/hooks/usePermission'
import type { AttendanceTableMember, AttendanceTableResponse } from '@/types'

const { Title, Text } = Typography

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

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL_W = 52
const NAME_W = 180
const ROW_H = 40
const HEADER_H = 60
const STATS_H = 32

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendanceTablePageDesktop() {
  const { id } = useParams<{ id: string }>()
  const groupId = Number(id)
  const navigate = useNavigate()
  const perms = usePermissions(['people.view', 'admins.viewProfiles'])

  const [data, setData] = useState<AttendanceTableResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [current, setCurrent] = useState<TableState | null>(null)
  const originalRef = useRef<TableState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [colModal, setColModal] = useState<string | null>(null)
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
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
        })
      })
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }, [groupId])

  const isDirty = current !== null && originalRef.current !== null &&
    JSON.stringify(current) !== JSON.stringify(originalRef.current)

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

  function openColModal(date: string) {
    const mt = current?.meetings[date]
    setSheetNotes(mt?.notes ?? '')
    setSheetCancelled(mt?.isCancelled ?? false)
    setSheetGuestCount(mt?.guestCount ?? 0)
    setSheetGuestInfo(mt?.guestInfo ?? '')
    setColModal(date)
  }

  function applyColModal() {
    if (!colModal || !current) return
    setCurrent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        meetings: {
          ...prev.meetings,
          [colModal]: {
            ...prev.meetings[colModal],
            notes: sheetNotes,
            isCancelled: sheetCancelled,
            guestCount: sheetGuestCount,
            guestInfo: sheetGuestInfo,
          },
        },
      }
    })
    setColModal(null)
  }

  async function handleDeleteMeeting() {
    if (!colModal) return
    Modal.confirm({
      title: 'Видалити зустріч?',
      content: `Видалити зустріч ${formatSheetDate(colModal)} з бази?`,
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await attendanceApi.deleteMeeting(groupId, colModal)
          setColModal(null)
          setLoading(true)
          const d = await attendanceApi.getTable(groupId)
          setData(d)
          const state = cloneTable(d)
          setCurrent(state)
          originalRef.current = cloneTable(d)
        } catch {
          Modal.error({ title: 'Помилка видалення' })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  async function save() {
    if (!current || !data) return
    setSaving(true)
    try {
      const entries: { date: string; personId?: number; userId?: number; wasPresent: boolean }[] = []
      for (const m of data.members) {
        const key = memberKey(m)
        const orig = originalRef.current?.attendance[key] ?? {}
        const cur = current.attendance[key] ?? {}
        for (const date of data.dates) {
          if (!(date in cur)) continue
          if (orig[date] !== cur[date]) {
            entries.push({ date, personId: m.personId ?? undefined, userId: m.userId ?? undefined, wasPresent: cur[date] })
          }
        }
      }

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
        entries.length > 0 ? attendanceApi.recordBulk({ homeGroupId: groupId, entries }) : Promise.resolve(),
        ...changedMeta.map((date) =>
          attendanceApi.saveMeta({
            homeGroupId: groupId, meetingDate: date,
            guestCount: current.meetings[date]?.guestCount ?? 0,
            guestInfo: current.meetings[date]?.guestInfo || undefined,
            notes: current.meetings[date]?.notes || undefined,
            isCancelled: current.meetings[date]?.isCancelled ?? false,
          })
        ),
      ])

      const d = await attendanceApi.getTable(groupId)
      setData(d)
      const state = cloneTable(d)
      setCurrent(state)
      originalRef.current = cloneTable(d)
    } catch {
      Modal.error({ title: 'Помилка збереження' })
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    if (originalRef.current) setCurrent(JSON.parse(JSON.stringify(originalRef.current)))
  }

  if (loading || !data || !current) {
    return (
      <div style={{ padding: 24 }}>
        <Space style={{ marginBottom: 20 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
          <Title level={3} style={{ margin: 0 }}>Таблиця відвідуваності</Title>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  const { dates, meetings, members } = data
  const totalW = NAME_W + dates.length * CELL_W

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
          <Title level={3} style={{ margin: 0 }}>Таблиця відвідуваності</Title>
        </Space>
        {isDirty && (
          <Space>
            <Button onClick={cancel} disabled={saving}>Скасувати</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
              Зберегти зміни
            </Button>
          </Space>
        )}
      </div>

      {/* ── Scrollable table ── */}
      <div style={{ flex: 1, overflow: 'hidden', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
        <div ref={scrollRef} style={{ height: '100%', overflowX: 'auto', overflowY: 'auto' }}>
          <div style={{ width: totalW, minWidth: '100%', position: 'relative' }}>

            {/* ── HEADER ROW ── */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: '#fafafa', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
              <div style={stickyNameCell(HEADER_H, true)}>
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ім'я / %</span>
              </div>
              {dates.map((date) => {
                const { day, month } = formatColDate(date)
                const mt = meetings.find((m) => m.date === date)
                const isCancelled = current.meetings[date]?.isCancelled ?? false
                return (
                  <button
                    key={date}
                    onClick={() => openColModal(date)}
                    style={{
                      width: CELL_W, height: HEADER_H, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                      background: isCancelled ? '#FEF9C3' : '#fafafa',
                      border: 'none', borderLeft: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: isCancelled ? '#92400e' : 'rgba(0,0,0,0.85)' }}>{day}</span>
                    <span style={{ fontSize: 10, color: isCancelled ? '#a16207' : 'rgba(0,0,0,0.45)', textTransform: 'uppercase' }}>{month}</span>
                    {mt?.notes && <span style={{ fontSize: 7, color: '#2AAFCA' }}>●</span>}
                  </button>
                )
              })}
            </div>

            {/* ── GUESTS ROW ── */}
            <div style={{ display: 'flex', position: 'sticky', top: HEADER_H, zIndex: 19, background: '#f5f5f5', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ ...stickyNameCell(STATS_H, false), background: '#f5f5f5' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>Гості</span>
              </div>
              {dates.map((date) => {
                const isCancelled = current.meetings[date]?.isCancelled ?? false
                const count = current.meetings[date]?.guestCount ?? 0
                return (
                  <button
                    key={date}
                    onClick={() => openColModal(date)}
                    style={{
                      width: CELL_W, height: STATS_H, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: count > 0 ? 700 : 400,
                      background: isCancelled ? '#FEF9C3' : '#f5f5f5',
                      color: count > 0 ? '#2AAFCA' : 'rgba(0,0,0,0.25)',
                      border: 'none', borderLeft: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {isCancelled ? '—' : (count > 0 ? count : '·')}
                  </button>
                )
              })}
            </div>

            {/* ── TOTAL ROW ── */}
            <div style={{ display: 'flex', position: 'sticky', top: HEADER_H + STATS_H, zIndex: 18, background: '#f5f5f5', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
              <div style={{ ...stickyNameCell(STATS_H, false), background: '#f5f5f5' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>Всього</span>
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
                    width: CELL_W, height: STATS_H, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                    background: isCancelled ? '#FEF9C3' : '#f5f5f5',
                    color: isCancelled ? '#a16207' : (count ?? 0) > 0 ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.25)',
                    borderLeft: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    {isCancelled ? '—' : (count ?? '·')}
                  </div>
                )
              })}
            </div>

            {/* ── MEMBER ROWS — active first, former at bottom ── */}
            {[...members].sort((a, b) => (a.leftAt ? 1 : 0) - (b.leftAt ? 1 : 0)).map((m, rowIdx) => {
              const key = memberKey(m)
              const att = current.attendance[key] ?? {}
              const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
              const rate = m.attendanceRate
              const isFormer = !!m.leftAt
              return (
                <div key={key} style={{
                  display: 'flex',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  background: rowIdx % 2 === 0 ? '#fff' : '#fafafa',
                }}>
                  <div style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    padding: '4px 10px 4px 14px',
                    background: rowIdx % 2 === 0 ? '#fff' : '#fafafa',
                    borderRight: `2px solid ${isFormer ? '#FECACA' : 'rgba(0,0,0,0.08)'}`,
                    height: ROW_H,
                  }}>
                    <span
                      onClick={() => {
                        if (m.userId != null && perms['admins.viewProfiles']) navigate(`/admins/${m.userId}`)
                        else if (m.personId != null && perms['people.view']) navigate(`/people/${m.personId}`)
                      }}
                      style={{ fontSize: 13, fontWeight: 600, color: isFormer ? '#DC2626' : 'rgba(0,0,0,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: NAME_W - 24, cursor: (m.userId != null && perms['admins.viewProfiles']) || (m.personId != null && perms['people.view']) ? 'pointer' : 'default' }}
                    >
                      {fullName}
                    </span>
                    <span style={{ fontSize: 11, color: rate >= 70 ? '#16a34a' : rate >= 40 ? '#d97706' : '#ef4444' }}>
                      {rate}%
                    </span>
                  </div>

                  {dates.map((date) => {
                    const isCancelled = current.meetings[date]?.isCancelled ?? false
                    if (isCancelled) {
                      return <div key={date} style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, flexShrink: 0, background: '#FEF9C3', borderLeft: '1px solid #FDE68A' }} />
                    }
                    const outsidePeriod = date < m.joinedAt || (!!m.leftAt && date > m.leftAt)
                    if (outsidePeriod) {
                      return <div key={date} style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, flexShrink: 0, background: '#E5E7EB', borderLeft: '1px solid #D1D5DB' }} />
                    }
                    const hasData = date in att
                    if (!hasData) {
                      return (
                        <button key={date} onClick={() => toggleCell(key, date)} style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, flexShrink: 0, background: '#F3F4F6', border: 'none', borderLeft: '1px solid #E5E7EB', cursor: 'pointer', outline: 'none' }} />
                      )
                    }
                    const present = att[date]
                    return (
                      <button key={date} onClick={() => toggleCell(key, date)} style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H, flexShrink: 0, background: present ? '#DCFCE7' : '#FEE2E2', border: 'none', borderLeft: `1px solid ${present ? '#BBF7D0' : '#FECACA'}`, cursor: 'pointer', outline: 'none', transition: 'background 0.1s' }} />
                    )
                  })}
                </div>
              )
            })}

          </div>
        </div>
      </div>

      {/* ── Column modal ── */}
      <Modal
        open={colModal !== null}
        title={colModal ? formatSheetDate(colModal) : ''}
        onCancel={() => setColModal(null)}
        onOk={applyColModal}
        okText="Готово"
        cancelText="Скасувати"
        width={480}
        footer={[
          isFuture(colModal ?? '') ? (
            <Button key="delete" danger onClick={handleDeleteMeeting} style={{ float: 'left' }}>
              Видалити зустріч
            </Button>
          ) : null,
          <Button key="cancel" onClick={() => setColModal(null)}>Скасувати</Button>,
          <Button key="ok" type="primary" onClick={applyColModal}>Готово</Button>,
        ]}
      >
        {colModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <div style={labelStyle}>Нотатки до зустрічі</div>
              <Input.TextArea
                value={sheetNotes}
                onChange={(e) => setSheetNotes(e.target.value)}
                placeholder="Тема, особливості, нагадування..."
                rows={3}
              />
            </div>

            <div>
              <div style={labelStyle}>Гості</div>
              <InputNumber
                min={0}
                value={sheetGuestCount}
                onChange={(v) => setSheetGuestCount(v ?? 0)}
              />
              {sheetGuestCount > 0 && (
                <Input.TextArea
                  value={sheetGuestInfo}
                  onChange={(e) => setSheetGuestInfo(e.target.value)}
                  placeholder="Імена або контакти гостей..."
                  rows={2}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <Text>Зустріч скасована</Text>
              <Switch checked={sheetCancelled} onChange={setSheetCancelled} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function stickyNameCell(h: number, isHeader: boolean): React.CSSProperties {
  return {
    position: 'sticky', left: 0,
    zIndex: isHeader ? 21 : 10,
    width: NAME_W, minWidth: NAME_W, height: h,
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    padding: '0 10px 0 14px',
    borderRight: '2px solid rgba(0,0,0,0.08)',
    background: isHeader ? '#fafafa' : undefined,
    flexShrink: 0,
  }
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
}
