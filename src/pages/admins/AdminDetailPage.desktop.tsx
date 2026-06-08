import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button, Card, Spin, Typography, Space, Tag, Row, Col, Descriptions,
  Modal, Input, Select, Switch, Divider,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { adminsApi } from '@/api/admins'
import { attendanceApi } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { rolesApi } from '@/api/roles'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { AdminTasksBlock } from '@/components/AdminTasksBlock'
import type { Admin, Group, AttendanceRecord } from '@/types'
import type { Role } from '@/api/roles'

const { Title, Text } = Typography
const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'

export function AdminDetailPageDesktop() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminId = Number(id)

  const [admin, setAdmin] = useState<Admin | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [statuses, setStatuses] = useState<PersonStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  // Modal states
  const [personalOpen, setPersonalOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [churchOpen, setChurchOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  const [draftDob, setDraftDob] = useState('')
  const [draftGender, setDraftGender] = useState('')
  const [draftMarital, setDraftMarital] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [draftTelegram, setDraftTelegram] = useState('')
  const [draftIsBaptized, setDraftIsBaptized] = useState(false)
  const [draftChurch, setDraftChurch] = useState('')
  const [draftMinistry, setDraftMinistry] = useState('')
  const [draftIsBaptizedWithSpirit, setDraftIsBaptizedWithSpirit] = useState(false)
  const [draftStatusId, setDraftStatusId] = useState<number | undefined>(undefined)
  const [newPwd, setNewPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  const load = () =>
    Promise.all([adminsApi.getById(adminId), groupsApi.getAll(), rolesApi.getAll(), personStatusesApi.getAll()])
      .then(([a, g, r, s]) => { setAdmin(a); setGroups(g); setRoles(r); setStatuses(s) })
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [adminId])

  useEffect(() => {
    if (!admin?.primaryGroupId) return
    setAttendanceLoading(true)
    const from = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10)
    attendanceApi.getByGroup(admin.primaryGroupId, from).then(setAttendance).finally(() => setAttendanceLoading(false))
  }, [admin?.primaryGroupId])

  if (loading || !admin) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')

  const save = async (patch: Partial<Parameters<typeof adminsApi.update>[1]>) => {
    const updated = await adminsApi.update(adminId, {
      name: admin.name, lastName: admin.lastName, email: admin.email,
      roleIds: admin.roles.map((r) => r.id),
      primaryGroupId: admin.primaryGroupId,
      visibleGroupIds: admin.visibleGroups.map((g) => g.id),
      ...patch,
    })
    setAdmin(updated)
  }

  const baseProfile = () => ({
    phone: admin.phone, telegram: admin.telegram, notes: admin.notes,
    gender: admin.gender, maritalStatus: admin.maritalStatus, address: admin.address,
    dateOfBirth: admin.dateOfBirth, isBaptized: admin.isBaptized,
    church: admin.church, ministry: admin.ministry,
    isBaptizedWithSpirit: admin.isBaptizedWithSpirit, personStatusId: admin.status?.id,
  })

  const saveProfile = async (patch: object) => {
    setProfileSaving(true)
    try {
      const updated = await adminsApi.updateProfile(adminId, { ...baseProfile(), ...patch })
      setAdmin(updated)
      return true
    } catch {
      Modal.error({ title: 'Помилка збереження' }); return false
    } finally { setProfileSaving(false) }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: 'Видалити адміна?',
      content: `"${fullName}" буде видалено назавжди.`,
      okText: 'Видалити', cancelText: 'Скасувати', okType: 'danger',
      onOk: async () => {
        await adminsApi.remove(adminId)
        navigate('/settings/admins', { replace: true })
      },
    })
  }

  const handleSetPassword = async () => {
    if (!newPwd.trim()) return
    setPwdSaving(true)
    try {
      await adminsApi.setPassword(adminId, newPwd)
      setPwdOpen(false); setNewPwd('')
    } catch {
      Modal.error({ title: 'Помилка зміни пароля' })
    }
    setPwdSaving(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{fullName || 'Адмін'}</Title>
      </Space>

      <Row gutter={[20, 20]}>
        {/* Left column */}
        <Col xs={24} lg={9}>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelStyle}>Ім'я</div>
                <Input
                  defaultValue={admin.name}
                  onBlur={(e) => { if (e.target.value !== admin.name) save({ name: e.target.value || admin.name }) }}
                  size="large"
                />
              </div>
              <div>
                <div style={labelStyle}>Прізвище</div>
                <Input
                  defaultValue={admin.lastName ?? ''}
                  onBlur={(e) => { if (e.target.value !== (admin.lastName ?? '')) save({ lastName: e.target.value || undefined }) }}
                />
              </div>
              <div>
                <div style={labelStyle}>Email</div>
                <Input
                  defaultValue={admin.email}
                  onBlur={(e) => { if (e.target.value !== admin.email) save({ email: e.target.value || admin.email }) }}
                  type="email"
                />
              </div>
              <Space>
                {admin.phone && <Button size="small" href={`tel:${admin.phone}`}>Подзвонити</Button>}
                {admin.telegram && <Button size="small" href={`https://t.me/${admin.telegram.replace('@', '')}`} target="_blank">Telegram</Button>}
                <Button size="small" onClick={() => { setNewPwd(''); setPwdOpen(true) }}>Змінити пароль</Button>
              </Space>
            </div>
          </Card>

          <Card title="Ролі" style={{ marginBottom: 16 }}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={admin.roles.map((r) => r.id)}
              onChange={(ids) => save({ roleIds: ids })}
              options={roles.map((r) => ({
                label: <span style={{ color: r.color, fontWeight: 600 }}>{r.name}</span>,
                value: r.id,
              }))}
              placeholder="Вибрати ролі"
            />
          </Card>

          <Card title="Домашні групи" style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Видимі домашки</div>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={admin.visibleGroups.map((g) => g.id)}
              onChange={(ids) => save({ visibleGroupIds: ids })}
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
              placeholder="Вибрати домашки"
            />
          </Card>

          {admin.id !== 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete} block>
              Видалити адміна
            </Button>
          )}
        </Col>

        {/* Right column */}
        <Col xs={24} lg={15}>
          <AdminTasksBlock adminId={adminId} />

          <Card
            title="Особиста інформація"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftDob(admin.dateOfBirth ?? ''); setDraftGender(admin.gender ?? '')
              setDraftMarital(admin.maritalStatus ?? ''); setDraftAddress(admin.address ?? '')
              setDraftNotes(admin.notes ?? ''); setPersonalOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Дата народження">{admin.dateOfBirth ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Стать">{genderLabel(admin.gender)}</Descriptions.Item>
              <Descriptions.Item label="Сімейний стан">{maritalLabel(admin.maritalStatus)}</Descriptions.Item>
              <Descriptions.Item label="Адреса" span={2}>{admin.address ?? '—'}</Descriptions.Item>
              {admin.notes && <Descriptions.Item label="Нотатки" span={2}>{admin.notes}</Descriptions.Item>}
            </Descriptions>
          </Card>

          <Card
            title="Комунікація"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftPhone(admin.phone ?? ''); setDraftTelegram(admin.telegram ?? ''); setContactOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Телефон">{admin.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Telegram">{admin.telegram ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>{admin.email}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="Церква"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftIsBaptized(admin.isBaptized); setDraftChurch(admin.church ?? '')
              setDraftMinistry(admin.ministry ?? ''); setDraftIsBaptizedWithSpirit(admin.isBaptizedWithSpirit)
              setDraftStatusId(admin.status?.id); setChurchOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Статус">
                {admin.status ? <Tag style={{ color: admin.status.color }}>{admin.status.name}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Хрещення">{admin.isBaptized ? 'Так' : 'Ні'}</Descriptions.Item>
              <Descriptions.Item label="Церква">{admin.church ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Служіння">{admin.ministry ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Хрещення Духом">{admin.isBaptizedWithSpirit ? 'Так' : 'Ні'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <AttendanceGrid
            userId={adminId}
            group={groups.find((g) => g.id === admin.primaryGroupId)}
            attendance={attendance}
            loading={attendanceLoading}
            noGroupMessage="Адмін не прив'язаний до групи"
          />
        </Col>
      </Row>

      {/* Modals */}
      <Modal open={personalOpen} title="Особиста інформація" onCancel={() => setPersonalOpen(false)}
        confirmLoading={profileSaving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => { const ok = await saveProfile({ dateOfBirth: draftDob || undefined, gender: draftGender || undefined, maritalStatus: draftMarital || undefined, address: draftAddress.trim() || undefined, notes: draftNotes.trim() || undefined }); if (ok) setPersonalOpen(false) }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><div style={labelStyle}>Дата народження</div><Input type="date" value={draftDob} onChange={(e) => setDraftDob(e.target.value)} /></div>
          <div>
            <div style={labelStyle}>Стать</div>
            <Select value={draftGender || undefined} onChange={(v) => setDraftGender(v ?? '')} style={{ width: '100%' }} allowClear placeholder="— не вказано —">
              <Select.Option value="Male">Чоловіча</Select.Option>
              <Select.Option value="Female">Жіноча</Select.Option>
            </Select>
          </div>
          <div>
            <div style={labelStyle}>Сімейний стан</div>
            <Select value={draftMarital || undefined} onChange={(v) => setDraftMarital(v ?? '')} style={{ width: '100%' }} allowClear placeholder="— не вказано —">
              <Select.Option value="Single">Не в шлюбі</Select.Option>
              <Select.Option value="Married">В шлюбі</Select.Option>
            </Select>
          </div>
          <div><div style={labelStyle}>Адреса</div><Input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} placeholder="Адреса" /></div>
          <div><div style={labelStyle}>Нотатки</div><Input.TextArea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} rows={2} /></div>
        </div>
      </Modal>

      <Modal open={contactOpen} title="Комунікація" onCancel={() => setContactOpen(false)}
        confirmLoading={profileSaving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => { const ok = await saveProfile({ phone: draftPhone.trim() || undefined, telegram: draftTelegram.trim() || undefined }); if (ok) setContactOpen(false) }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><div style={labelStyle}>Телефон</div><Input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} placeholder="+380..." /></div>
          <div><div style={labelStyle}>Telegram</div><Input value={draftTelegram} onChange={(e) => setDraftTelegram(e.target.value)} placeholder="@username" /></div>
        </div>
      </Modal>

      <Modal open={churchOpen} title="Церква" onCancel={() => setChurchOpen(false)}
        confirmLoading={profileSaving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => { const ok = await saveProfile({ isBaptized: draftIsBaptized, church: draftChurch.trim() || undefined, ministry: draftMinistry.trim() || undefined, isBaptizedWithSpirit: draftIsBaptizedWithSpirit, personStatusId: draftStatusId }); if (ok) setChurchOpen(false) }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>Статус</div>
            <Select value={draftStatusId} onChange={(v) => setDraftStatusId(v)} style={{ width: '100%' }} allowClear placeholder="— без статусу —">
              {statuses.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Хрещений(а)</Text>
            <Switch checked={draftIsBaptized} onChange={setDraftIsBaptized} />
          </div>
          <div><div style={labelStyle}>Церква</div><Input value={draftChurch} onChange={(e) => setDraftChurch(e.target.value)} /></div>
          <div><div style={labelStyle}>Служіння</div><Input value={draftMinistry} onChange={(e) => setDraftMinistry(e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Хрещення Духом</Text>
            <Switch checked={draftIsBaptizedWithSpirit} onChange={setDraftIsBaptizedWithSpirit} />
          </div>
        </div>
      </Modal>

      <Modal open={pwdOpen} title="Новий пароль" onCancel={() => setPwdOpen(false)}
        confirmLoading={pwdSaving} okText="Зберегти" cancelText="Скасувати"
        onOk={handleSetPassword} destroyOnClose>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Новий пароль<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span></div>
        <Input.Password value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Новий пароль" autoFocus />
      </Modal>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
}
