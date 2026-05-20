import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Typography, Space, Select, Modal, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { adminsApi } from '@/api/admins'
import { groupsApi } from '@/api/groups'
import { rolesApi } from '@/api/roles'
import type { Group } from '@/types'
import type { Role } from '@/api/roles'

const { Title } = Typography

export function AdminCreatePageDesktop() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [primaryGroupId, setPrimaryGroupId] = useState<number | undefined>()
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  const [roles, setRoles] = useState<Role[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([rolesApi.getAll(), groupsApi.getAll()])
      .then(([r, g]) => { setRoles(r); setGroups(g) })
  }, [])

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Modal.error({ title: "Заповніть ім'я, email та пароль" }); return
    }
    setSaving(true)
    try {
      const admin = await adminsApi.create({
        name: name.trim(), lastName: lastName.trim() || undefined,
        email: email.trim(), password,
        roleIds: selectedRoleIds, primaryGroupId, visibleGroupIds,
      })
      navigate(`/settings/admins/${admin.id}`, { replace: true })
    } catch {
      Modal.error({ title: 'Помилка створення' })
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settings/admins')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>Новий адмін</Title>
      </Space>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <Row gutter={[16, 0]}>
          <Col span={12}>
            <div style={labelStyle}>Ім'я</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ім'я" size="large" />
          </Col>
          <Col span={12}>
            <div style={labelStyle}>Прізвище</div>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Прізвище" size="large" />
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Email</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" size="large" />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Пароль</div>
          <Input.Password value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" size="large" />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={labelStyle}>Ролі</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Вибрати ролі"
            value={selectedRoleIds}
            onChange={setSelectedRoleIds}
            options={roles.map((r) => ({
              label: <span style={{ color: r.color, fontWeight: 600 }}>{r.name}</span>,
              value: r.id,
            }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Рідна домашка</div>
          <Select
            style={{ width: '100%' }}
            placeholder="— не вибрано —"
            value={primaryGroupId}
            onChange={(v) => setPrimaryGroupId(v)}
            allowClear
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Видимі домашки</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Вибрати домашки"
            value={visibleGroupIds}
            onChange={setVisibleGroupIds}
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
          />
        </div>

        <Button
          type="primary" loading={saving} onClick={handleCreate}
          size="large" style={{ width: '100%', fontWeight: 600, marginTop: 24 }}
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
