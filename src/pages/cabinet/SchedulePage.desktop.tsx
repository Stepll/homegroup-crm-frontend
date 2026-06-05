import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Typography, Space, Card, Modal, DatePicker, Checkbox, Spin, Tag, Alert } from 'antd'
import { ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { scheduleApi, type ScheduleWeek, type ScheduleStatus } from '@/api/schedule'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

const { Title, Text } = Typography

const PAST_WEEKS = 4
const FUTURE_WEEKS = 8

function fmtRange(weekStart: string) {
  const start = dayjs(weekStart)
  const end = start.add(6, 'day')
  if (start.month() === end.month()) {
    return `${start.format('D')}–${end.format('D MMM')}`
  }
  return `${start.format('D MMM')} – ${end.format('D MMM')}`
}

function fmtDate(iso: string) {
  return dayjs(iso).format('dd, D MMM')
}

const STATUS_LABEL: Record<ScheduleStatus, { text: string; color: string }> = {
  default: { text: 'За розкладом', color: 'default' },
  cancelled: { text: 'Скасована', color: 'red' },
  rescheduled_internal: { text: 'Перенесена в межах тижня', color: 'gold' },
  moved_in: { text: 'Перенесена з іншого тижня', color: 'blue' },
  moved_out: { text: 'Перенесена в інший тиждень', color: 'purple' },
}

export function SchedulePageDesktop() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const groupId = Number(id)

  const [group, setGroup] = useState<Group | null>(null)
  const [weeks, setWeeks] = useState<ScheduleWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [past, setPast] = useState(PAST_WEEKS)

  const [modal, setModal] = useState<{ week: ScheduleWeek } | null>(null)
  const [modalDate, setModalDate] = useState<Dayjs | null>(null)
  const [modalCancelled, setModalCancelled] = useState(false)
  const [modalMovePlan, setModalMovePlan] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const today = dayjs()
      const from = today.subtract(past, 'week').startOf('week').add(1, 'day').format('YYYY-MM-DD') // Monday
      const to = today.add(FUTURE_WEEKS, 'week').endOf('week').add(1, 'day').format('YYYY-MM-DD')
      const [g, w] = await Promise.all([
        groupsApi.getById(groupId),
        scheduleApi.getWeeks(groupId, from, to),
      ])
      setGroup(g)
      setWeeks(w.reverse()) // newest first
    } catch {
      Modal.error({ title: 'Помилка завантаження' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [groupId, past])

  function openModal(week: ScheduleWeek) {
    setModalDate(week.effectiveDate ? dayjs(week.effectiveDate) : dayjs(week.defaultDate))
    setModalCancelled(week.effectiveDate === null)
    setModalMovePlan(true)
    setModal({ week })
  }

  async function applyChanges() {
    if (!modal) return
    const w = modal.week
    setSaving(true)
    try {
      // Source date for any move: current effective date, or default if currently cancelled
      const sourceDateForMove = w.effectiveDate ?? w.defaultDate

      // Step 1: cancellation toggle
      if (modalCancelled && w.effectiveDate !== null) {
        await scheduleApi.cancel(groupId, w.effectiveDate)
      } else if (!modalCancelled && w.status === 'cancelled') {
        await scheduleApi.uncancel(groupId, w.defaultDate)
      }

      // Step 2: date change — works even if previously cancelled (uses defaultDate as source)
      const newDateStr = modalDate?.format('YYYY-MM-DD')
      if (!modalCancelled && newDateStr && newDateStr !== sourceDateForMove) {
        await scheduleApi.move(groupId, sourceDateForMove, newDateStr, modalMovePlan)
      }

      setModal(null)
      await loadData()
    } catch (e) {
      console.error('Schedule save error:', e)
      Modal.error({ title: 'Помилка збереження', content: String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function resetWeek(week: ScheduleWeek) {
    Modal.confirm({
      title: 'Скинути тиждень?',
      content: (
        <div>
          <p>Тиждень {fmtRange(week.weekStart)} повернеться до дефолтного розкладу.</p>
          {week.attendanceRecordCount > 0 && (
            <Alert type="warning" message={`На цій даті є ${week.attendanceRecordCount} записів відвідуваності. Вони залишаться в базі.`} style={{ marginTop: 8 }} />
          )}
          {(week.status === 'moved_in' || week.status === 'moved_out') && (
            <Alert type="info" message="Зв'язаний тиждень також буде очищений." style={{ marginTop: 8 }} />
          )}
        </div>
      ),
      okText: 'Скинути',
      cancelText: 'Скасувати',
      onOk: async () => {
        try {
          await scheduleApi.resetWeek(groupId, week.weekStart, true)
          setModal(null)
          await loadData()
        } catch {
          Modal.error({ title: 'Помилка' })
        }
      },
    })
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Space style={{ marginBottom: 20 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/cabinet/${id}`)}>Назад</Button>
          <Title level={3} style={{ margin: 0 }}>Графік зустрічей</Title>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}><Spin size="large" /></div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/cabinet/${id}`)}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>Графік зустрічей</Title>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Text type="secondary">Дефолтний розклад: </Text>
        <Text strong>{group?.meetingDay ?? '—'} {group?.meetingTime ?? ''}</Text>
      </Card>

      <Card title="Тижні" size="small">
        {weeks.map((w) => {
          const label = STATUS_LABEL[w.status]
          return (
            <div key={w.weekStart} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Тиждень {fmtRange(w.weekStart)}</div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                  {w.effectiveDate ? fmtDate(w.effectiveDate) : '—'}
                  <Tag color={label.color} style={{ marginLeft: 8 }}>{label.text}</Tag>
                  {w.movedFromDate && <Text type="secondary" style={{ marginLeft: 4 }}>← з {fmtDate(w.movedFromDate)}</Text>}
                  {w.movedToDate && <Text type="secondary" style={{ marginLeft: 4 }}>→ {fmtDate(w.movedToDate)}</Text>}
                  {w.hasPlan && <Tag color="cyan" style={{ marginLeft: 8 }}>план</Tag>}
                  {w.attendanceRecordCount > 0 && <Tag color="green" style={{ marginLeft: 4 }}>{w.attendanceRecordCount} відмічено</Tag>}
                </div>
              </div>
              <Space>
                {w.status !== 'default' && (
                  <Button size="small" onClick={() => resetWeek(w)}>Скинути</Button>
                )}
                <Button size="small" icon={<SettingOutlined />} onClick={() => openModal(w)}>Налаштувати</Button>
              </Space>
            </div>
          )
        })}

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button size="small" onClick={() => setPast(p => p + 4)}>Показати ще минулі</Button>
        </div>
      </Card>

      <Modal
        open={modal !== null}
        onCancel={() => setModal(null)}
        onOk={applyChanges}
        confirmLoading={saving}
        title={modal ? `Тиждень ${fmtRange(modal.week.weekStart)}` : ''}
        okText="Зберегти"
        cancelText="Скасувати"
      >
        {modal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
            <Checkbox checked={modalCancelled} onChange={(e) => setModalCancelled(e.target.checked)}>
              Зустріч скасована
            </Checkbox>
            {!modalCancelled && (
              <>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
                    Дата зустрічі
                  </div>
                  <DatePicker
                    value={modalDate}
                    onChange={setModalDate}
                    format="DD MMM YYYY"
                    style={{ width: '100%' }}
                    allowClear={false}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>Дефолт: {fmtDate(modal.week.defaultDate)}</Text>
                </div>
                {modal.week.hasPlan && (
                  <Checkbox checked={modalMovePlan} onChange={(e) => setModalMovePlan(e.target.checked)}>
                    Перенести план з оригінальної дати
                  </Checkbox>
                )}
              </>
            )}
            {modal.week.attendanceRecordCount > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`На поточній даті є ${modal.week.attendanceRecordCount} записів відвідуваності. Перенесення не перенесе ці записи.`}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
