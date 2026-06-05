import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, SpinLoading, Toast, Dialog, Popup, Button, Switch, DatePicker } from 'antd-mobile'
import dayjs, { Dayjs } from 'dayjs'
import { scheduleApi, type ScheduleWeek, type ScheduleStatus } from '@/api/schedule'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

const PAST_WEEKS = 4
const FUTURE_WEEKS = 8

function fmtRange(weekStart: string) {
  const start = dayjs(weekStart)
  const end = start.add(6, 'day')
  if (start.month() === end.month()) return `${start.format('D')}–${end.format('D MMM')}`
  return `${start.format('D MMM')} – ${end.format('D MMM')}`
}

function fmtDate(iso: string) {
  return dayjs(iso).format('dd, D MMM')
}

const STATUS_COLOR: Record<ScheduleStatus, string> = {
  default: '#6B7280',
  cancelled: '#DC2626',
  rescheduled_internal: '#D97706',
  moved_in: '#2563EB',
  moved_out: '#7C3AED',
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  default: 'За розкладом',
  cancelled: 'Скасована',
  rescheduled_internal: 'Перенесена в межах тижня',
  moved_in: 'Перенесена з іншого тижня',
  moved_out: 'Перенесена в інший тиждень',
}

export function SchedulePageMobile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const groupId = Number(id)

  const [group, setGroup] = useState<Group | null>(null)
  const [weeks, setWeeks] = useState<ScheduleWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [past, setPast] = useState(PAST_WEEKS)

  const [editing, setEditing] = useState<ScheduleWeek | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [modalDate, setModalDate] = useState<Dayjs | null>(null)
  const [modalCancelled, setModalCancelled] = useState(false)
  const [modalMovePlan, setModalMovePlan] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const today = dayjs()
      const from = today.subtract(past, 'week').startOf('week').add(1, 'day').format('YYYY-MM-DD')
      const to = today.add(FUTURE_WEEKS, 'week').endOf('week').add(1, 'day').format('YYYY-MM-DD')
      const [g, w] = await Promise.all([
        groupsApi.getById(groupId),
        scheduleApi.getWeeks(groupId, from, to),
      ])
      setGroup(g)
      setWeeks(w.reverse())
    } catch {
      Toast.show({ content: 'Помилка завантаження', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [groupId, past])

  function openEditor(w: ScheduleWeek) {
    setModalDate(w.effectiveDate ? dayjs(w.effectiveDate) : dayjs(w.defaultDate))
    setModalCancelled(w.effectiveDate === null)
    setModalMovePlan(true)
    setEditing(w)
  }

  async function applyChanges() {
    if (!editing) return
    const w = editing
    setSaving(true)
    try {
      const sourceDateForMove = w.effectiveDate ?? w.defaultDate

      if (modalCancelled && w.effectiveDate !== null) {
        await scheduleApi.cancel(groupId, w.effectiveDate)
      } else if (!modalCancelled && w.status === 'cancelled') {
        await scheduleApi.uncancel(groupId, w.defaultDate)
      }
      const newDateStr = modalDate?.format('YYYY-MM-DD')
      if (!modalCancelled && newDateStr && newDateStr !== sourceDateForMove) {
        await scheduleApi.move(groupId, sourceDateForMove, newDateStr, modalMovePlan)
      }
      setEditing(null)
      await loadData()
      Toast.show({ content: 'Збережено', icon: 'success' })
    } catch (e) {
      console.error('Schedule save error:', e)
      Toast.show({ content: `Помилка: ${String(e)}`, icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  async function resetWeek(w: ScheduleWeek) {
    const linkedNote = (w.status === 'moved_in' || w.status === 'moved_out')
      ? ' Зв\'язаний тиждень теж очиститься.'
      : ''
    const attNote = w.attendanceRecordCount > 0
      ? ` Записи відвідуваності (${w.attendanceRecordCount}) залишаться в базі.`
      : ''
    const confirmed = await Dialog.confirm({
      content: `Тиждень ${fmtRange(w.weekStart)} повернеться до дефолту.${linkedNote}${attNote}`,
      confirmText: 'Скинути',
      cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await scheduleApi.resetWeek(groupId, w.weekStart, true)
      setEditing(null)
      await loadData()
      Toast.show({ content: 'Скинуто', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка', icon: 'fail' })
    }
  }

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate(`/cabinet/${id}`)}>Графік зустрічей</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}><SpinLoading color="primary" /></div>
      </>
    )
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate(`/cabinet/${id}`)}>Графік зустрічей</NavBar>

      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Дефолтний розклад</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{group?.meetingDay ?? '—'} {group?.meetingTime ?? ''}</div>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {weeks.map((w) => (
          <button
            key={w.weekStart}
            onClick={() => openEditor(w)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '12px 14px', borderRadius: 10,
              background: '#fff', border: `1px solid var(--color-border-light)`,
              borderLeft: `4px solid ${STATUS_COLOR[w.status]}`,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Тиждень {fmtRange(w.weekStart)}</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
              {w.effectiveDate ? fmtDate(w.effectiveDate) : '— зустрічі нема'}
              <span style={{ marginLeft: 8, color: STATUS_COLOR[w.status], fontSize: 12 }}>{STATUS_LABEL[w.status]}</span>
            </div>
            {(w.movedFromDate || w.movedToDate || w.hasPlan || w.attendanceRecordCount > 0) && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {w.movedFromDate && <span>← з {fmtDate(w.movedFromDate)} </span>}
                {w.movedToDate && <span>→ {fmtDate(w.movedToDate)} </span>}
                {w.hasPlan && <span>· план </span>}
                {w.attendanceRecordCount > 0 && <span>· {w.attendanceRecordCount} відмічено</span>}
              </div>
            )}
          </button>
        ))}

        <Button size="small" onClick={() => setPast(p => p + 4)} style={{ marginTop: 8 }}>
          Показати ще минулі
        </Button>
      </div>

      <Popup
        visible={editing !== null}
        onMaskClick={() => setEditing(null)}
        position="bottom"
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        {editing && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Тиждень {fmtRange(editing.weekStart)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--color-border-light)' }}>
              <span>Зустріч скасована</span>
              <Switch checked={modalCancelled} onChange={setModalCancelled} />
            </div>

            {!modalCancelled && (
              <>
                <div style={{ padding: '10px 0', borderTop: '1px solid var(--color-border-light)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Дата зустрічі</div>
                  <Button block onClick={() => setDatePickerOpen(true)}>
                    {modalDate?.format('DD MMM YYYY')}
                  </Button>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                    Дефолт: {fmtDate(editing.defaultDate)}
                  </div>
                </div>

                {editing.hasPlan && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--color-border-light)' }}>
                    <span style={{ fontSize: 14 }}>Перенести план</span>
                    <Switch checked={modalMovePlan} onChange={setModalMovePlan} />
                  </div>
                )}
              </>
            )}

            {editing.attendanceRecordCount > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#FEF3C7', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
                На поточній даті є {editing.attendanceRecordCount} записів відвідуваності.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {editing.status !== 'default' && (
                <Button color="danger" fill="outline" style={{ flex: 1 }} onClick={() => resetWeek(editing)}>
                  Скинути тиждень
                </Button>
              )}
              <Button color="primary" loading={saving} style={{ flex: 1 }} onClick={applyChanges}>
                Зберегти
              </Button>
            </div>
          </div>
        )}
      </Popup>

      <DatePicker
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        value={modalDate?.toDate()}
        precision="day"
        onConfirm={(d) => setModalDate(dayjs(d))}
      />
    </div>
  )
}
