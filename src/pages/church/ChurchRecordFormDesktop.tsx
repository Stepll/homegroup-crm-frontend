import { useState } from 'react'
import { Modal, Form, InputNumber, Input, DatePicker, message } from 'antd'
import dayjs from 'dayjs'
import { churchServicesApi, SERVICE_TYPES, type ChurchServiceRecord, type ServiceType } from '@/api/churchServices'

interface Props {
  serviceType: ServiceType
  record: ChurchServiceRecord | null
  onClose: () => void
  onSaved: () => void
}

export function ChurchRecordFormDesktop({ serviceType, record, onClose, onSaved }: Props) {
  const meta = SERVICE_TYPES.find((t) => t.key === serviceType)!
  const isEdit = record !== null
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const initialValues = {
    date: record ? dayjs(record.date) : dayjs(),
    attendanceCount: record?.attendanceCount ?? undefined,
    communionCount: record?.communionCount ?? undefined,
    notes: record?.notes ?? undefined,
  }

  const handleOk = async () => {
    try {
      const vals = await form.validateFields()
      const dateStr = (vals.date as dayjs.Dayjs).format('YYYY-MM-DD')
      setSaving(true)
      if (isEdit) {
        await churchServicesApi.update(record!.id, {
          attendanceCount: vals.attendanceCount,
          communionCount: vals.communionCount ?? null,
          notes: vals.notes || null,
        })
      } else {
        await churchServicesApi.create({
          serviceType,
          date: dateStr,
          attendanceCount: vals.attendanceCount,
          communionCount: vals.communionCount ?? null,
          notes: vals.notes || null,
        })
      }
      message.success('Збережено')
      onSaved()
    } catch (e: any) {
      if (e?.response) {
        message.error(e?.response?.data?.message ?? 'Помилка збереження')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={`${isEdit ? 'Редагувати' : 'Новий запис'} — ${meta.label}`}
      onOk={handleOk}
      onCancel={onClose}
      okText="Зберегти"
      cancelText="Скасувати"
      confirmLoading={saving}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="date" label="Дата" rules={[{ required: true, message: 'Вкажіть дату' }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
        </Form.Item>
        <Form.Item name="attendanceCount" label="Присутніх" rules={[{ required: true, message: 'Вкажіть кількість' }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        {meta.hasCommunion && (
          <Form.Item name="communionCount" label="Причастя (якщо було)">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="залиште порожнім якщо не було" />
          </Form.Item>
        )}
        <Form.Item name="notes" label="Нотатки">
          <Input.TextArea rows={2} placeholder="необов'язково" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
