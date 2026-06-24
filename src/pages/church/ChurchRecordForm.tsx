import { useState } from 'react'
import { Popup, Form, Input, Toast, Button } from 'antd-mobile'
import { churchServicesApi, SERVICE_TYPES, type ChurchServiceRecord, type ServiceType } from '@/api/churchServices'

interface Props {
  serviceType: ServiceType
  record: ChurchServiceRecord | null
  onClose: () => void
  onSaved: () => void
}

export function ChurchRecordForm({ serviceType, record, onClose, onSaved }: Props) {
  const meta = SERVICE_TYPES.find((t) => t.key === serviceType)!
  const isEdit = record !== null

  const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const [date, setDate] = useState(record?.date ?? todayStr())
  const [attendance, setAttendance] = useState(record ? String(record.attendanceCount) : '')
  const [communion, setCommunion] = useState(record?.communionCount != null ? String(record.communionCount) : '')
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const count = parseInt(attendance)
    if (!date) { Toast.show({ content: 'Вкажіть дату', icon: 'fail' }); return }
    if (isNaN(count) || count < 0) { Toast.show({ content: 'Вкажіть кількість присутніх', icon: 'fail' }); return }

    const communionVal = meta.hasCommunion && communion !== '' ? parseInt(communion) : null
    if (meta.hasCommunion && communion !== '' && isNaN(communionVal!)) {
      Toast.show({ content: 'Невірна кількість причасників', icon: 'fail' })
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await churchServicesApi.update(record!.id, {
          attendanceCount: count,
          communionCount: communionVal,
          notes: notes || null,
        })
      } else {
        await churchServicesApi.create({
          serviceType,
          date,
          attendanceCount: count,
          communionCount: communionVal,
          notes: notes || null,
        })
      }
      Toast.show({ content: 'Збережено', icon: 'success' })
      onSaved()
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Помилка збереження'
      Toast.show({ content: msg, icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popup
      visible
      onMaskClick={onClose}
      bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '16px 0 32px' }}
    >
      <div style={{ padding: '0 16px 8px', fontWeight: 600, fontSize: 16 }}>
        {isEdit ? 'Редагувати запис' : 'Новий запис'} — {meta.label}
      </div>

      <Form layout="horizontal" style={{ '--border-top': 'none' } as React.CSSProperties}>
        <Form.Item label="Дата">
          <Input
            type="date"
            value={date}
            onChange={setDate}
            style={{ textAlign: 'right' }}
          />
        </Form.Item>

        <Form.Item label="Присутніх">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={attendance}
            onChange={setAttendance}
            style={{ textAlign: 'right' }}
          />
        </Form.Item>

        {meta.hasCommunion && (
          <Form.Item label="Причастя">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="не відбулось"
              value={communion}
              onChange={setCommunion}
              style={{ textAlign: 'right' }}
            />
          </Form.Item>
        )}

        <Form.Item label="Нотатки">
          <Input
            placeholder="необов'язково"
            value={notes}
            onChange={setNotes}
          />
        </Form.Item>
      </Form>

      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
        <Button block onClick={onClose} style={{ flex: 1 }}>Скасувати</Button>
        <Button block color="primary" onClick={handleSave} loading={saving} style={{ flex: 1 }}>
          Зберегти
        </Button>
      </div>
    </Popup>
  )
}
