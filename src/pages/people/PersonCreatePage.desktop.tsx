import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Typography, Space, Select, Modal } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

const { Title } = Typography

export function PersonCreatePageDesktop() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [groupId, setGroupId] = useState<number | undefined>()
  const [groups, setGroups] = useState<Group[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!name.trim()) { Modal.error({ title: "Ім'я обов'язкове" }); return }
    setSaving(true)
    try {
      const person = await peopleApi.create({ name: name.trim(), lastName: lastName.trim() || undefined, primaryGroupId: groupId })
      navigate(`/people/${person.id}`, { replace: true })
    } catch {
      Modal.error({ title: 'Помилка створення' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/people')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>Нова людина</Title>
      </Space>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Ім'я <span style={{ color: '#ff4d4f' }}>*</span></div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ім'я" size="large" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Прізвище</div>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Прізвище" size="large" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>Домашня група</div>
          <Select
            style={{ width: '100%' }}
            placeholder="— не вибрано —"
            value={groupId}
            onChange={(v) => setGroupId(v)}
            allowClear
            size="large"
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
          />
        </div>

        <Button
          type="primary" loading={saving} onClick={handleSave}
          size="large" style={{ width: '100%', fontWeight: 600 }}
        >
          Створити
        </Button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
}
