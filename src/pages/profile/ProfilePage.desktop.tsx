import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Card, Spin, Typography, Space, Tag, Row, Col, Descriptions,
  Modal, Input, Select, Switch, Divider,
} from 'antd'
import { LogoutOutlined, EditOutlined, LockOutlined } from '@ant-design/icons'
import { adminsApi } from '@/api/admins'
import { attendanceApi } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { useAuth } from '@/store/auth'
import type { Admin, Group, AttendanceRecord } from '@/types'

const { Title, Text } = Typography
const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'

export function ProfilePageDesktop() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [admin, setAdmin] = useState<Admin | null>(null)
  const [statuses, setStatuses] = useState<PersonStatus[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const [personalOpen, setPersonalOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [churchOpen, setChurchOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  const [draftName, setDraftName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
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

  useEffect(() => {
    Promise.all([adminsApi.getMe(), personStatusesApi.getAll(), groupsApi.getAll()])
      .then(([a, s, g]) => { setAdmin(a); setStatuses(s); setGroups(g) })
      .catch(() => Modal.error({ title: 'Помилка завантаження' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!admin?.primaryGroupId) return
    setAttendanceLoading(true)
    const from = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10)
    attendanceApi.getByGroup(admin.primaryGroupId, from).then(setAttendance).finally(() => setAttendanceLoading(false))
  }, [admin?.primaryGroupId])

  if (loading || !admin) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

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
      const updated = await adminsApi.updateProfile(admin.id, { ...baseProfile(), ...patch })
      setAdmin(updated)
      return true
    } catch {
      Modal.error({ title: 'Помилка збереження' }); return false
    } finally { setProfileSaving(false) }
  }

  const handleSetPassword = async () => {
    if (!newPwd.trim()) return
    setPwdSaving(true)
    try {
      await adminsApi.setMyPassword(newPwd)
      setPwdOpen(false); setNewPwd('')
    } catch {
      Modal.error({ title: 'Помилка зміни пароля' })
    }
    setPwdSaving(false)
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Профіль</Title>
        <Button icon={<LogoutOutlined />} danger onClick={handleLogout}>Вийти</Button>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2AAFCA 0%, #1a8fab 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: '#fff',
              }}>
                {initials}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{fullName || admin.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                  {admin.roles.map((r) => (
                    <Tag key={r.id} style={{ color: r.color, background: `${r.color}18`, borderColor: `${r.color}40` }}>{r.name}</Tag>
                  ))}
                </div>
                {admin.primaryGroupName && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{admin.primaryGroupName}</Text>
                )}
              </div>
              <Space>
                {admin.phone && <Button size="small" href={`tel:${admin.phone}`}>Подзвонити</Button>}
                {admin.telegram && <Button size="small" href={`https://t.me/${admin.telegram.replace('@', '')}`} target="_blank">Telegram</Button>}
              </Space>
              <Button icon={<LockOutlined />} onClick={() => { setNewPwd(''); setPwdOpen(true) }} style={{ width: '100%' }}>
                Змінити пароль
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title="Особиста інформація"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftName(admin.name); setDraftLastName(admin.lastName ?? '')
              setDraftDob(admin.dateOfBirth ?? ''); setDraftGender(admin.gender ?? '')
              setDraftMarital(admin.maritalStatus ?? ''); setDraftAddress(admin.address ?? '')
              setDraftNotes(admin.notes ?? ''); setPersonalOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Ім'я">{fullName || admin.name}</Descriptions.Item>
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
            userId={admin.id}
            group={groups.find((g) => g.id === admin.primaryGroupId)}
            attendance={attendance}
            loading={attendanceLoading}
            noGroupMessage="Не прив'язаний до групи"
          />
        </Col>
      </Row>

      <Modal open={personalOpen} title="Особиста інформація" onCancel={() => setPersonalOpen(false)}
        confirmLoading={profileSaving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => {
          if (!draftName.trim()) { Modal.error({ title: "Ім'я обов'язкове" }); return }
          const ok = await saveProfile({ name: draftName.trim(), lastName: draftLastName.trim() || undefined, dateOfBirth: draftDob || undefined, gender: draftGender || undefined, maritalStatus: draftMarital || undefined, address: draftAddress.trim() || undefined, notes: draftNotes.trim() || undefined })
          if (ok) setPersonalOpen(false)
        }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><div style={labelStyle}>Ім'я</div><Input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></div>
          <div><div style={labelStyle}>Прізвище</div><Input value={draftLastName} onChange={(e) => setDraftLastName(e.target.value)} /></div>
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
          <div><div style={labelStyle}>Адреса</div><Input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} /></div>
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
          <Divider style={{ margin: '4px 0' }} />
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
