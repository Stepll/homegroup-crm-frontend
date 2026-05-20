import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Spin, Typography, Space, Tag, Row, Col, Descriptions, Modal, Input, Select, Switch, Divider } from 'antd'
import { ArrowLeftOutlined, EditOutlined, MessageOutlined, DeleteOutlined } from '@ant-design/icons'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import { adminsApi } from '@/api/admins'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import { attendanceApi } from '@/api/attendance'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { usePermission } from '@/hooks/usePermission'
import type { Person, CustomField, Group, Admin, AttendanceRecord } from '@/types'

const { Title, Text } = Typography
const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function PersonDetailPageDesktop() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const personId = Number(id)
  const canViewSensitive = usePermission('people.viewSensitive')

  const [person, setPerson] = useState<Person | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [statuses, setStatuses] = useState<PersonStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [personalOpen, setPersonalOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [churchOpen, setChurchOpen] = useState(false)
  const [oversightOpen, setOversightOpen] = useState(false)
  const [addFieldVisible, setAddFieldVisible] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')

  const [draftName, setDraftName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [draftDob, setDraftDob] = useState('')
  const [draftGender, setDraftGender] = useState('')
  const [draftMarital, setDraftMarital] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftGroup, setDraftGroup] = useState<number | null>(null)
  const [draftPhone, setDraftPhone] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftTelegram, setDraftTelegram] = useState('')
  const [draftIsBaptized, setDraftIsBaptized] = useState(false)
  const [draftChurch, setDraftChurch] = useState('')
  const [draftMinistry, setDraftMinistry] = useState('')
  const [draftIsBaptizedWithSpirit, setDraftIsBaptizedWithSpirit] = useState(false)
  const [draftOversightUserId, setDraftOversightUserId] = useState<number | null>(null)
  const [draftStatusId, setDraftStatusId] = useState<number | null>(null)

  const load = () =>
    Promise.all([
      peopleApi.getById(personId),
      groupsApi.getAll(),
      adminsApi.getAll().catch(() => [] as Admin[]),
      personStatusesApi.getAll(),
    ])
      .then(([p, g, a, s]) => { setPerson(p); setGroups(g); setAdmins(a); setStatuses(s) })
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [personId])

  useEffect(() => {
    if (!person?.primaryGroupId) return
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth() - 11, 1)
    setAttendanceLoading(true)
    attendanceApi.getByGroup(person.primaryGroupId, fmtDate(from), fmtDate(today))
      .then(setAttendance).catch(() => {}).finally(() => setAttendanceLoading(false))
  }, [person?.primaryGroupId])

  if (loading || !person) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>

  const fullName = [person.name, person.lastName].filter(Boolean).join(' ')
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const basePayload = () => ({
    name: person.name, lastName: person.lastName, phone: person.phone, email: person.email,
    telegram: person.telegram, notes: person.notes, gender: person.gender, maritalStatus: person.maritalStatus,
    address: person.address, dateOfBirth: person.dateOfBirth, isBaptized: person.isBaptized,
    church: person.church, ministry: person.ministry, isBaptizedWithSpirit: person.isBaptizedWithSpirit,
    personStatusId: person.status?.id ?? null, oversightInfo: person.oversightInfo,
    oversightUserId: person.oversightUserId ?? null, primaryGroupId: person.primaryGroupId,
  })

  const doSave = async (patch: object) => {
    setSaving(true)
    try {
      const updated = await peopleApi.update(personId, { ...basePayload(), ...patch })
      setPerson(updated); return true
    } catch {
      Modal.error({ title: 'Помилка збереження' }); return false
    } finally { setSaving(false) }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: 'Видалити людину?',
      content: `"${fullName}" буде видалено назавжди.`,
      okText: 'Видалити', okType: 'danger', cancelText: 'Скасувати',
      onOk: async () => {
        await peopleApi.remove(personId)
        navigate('/people', { replace: true })
      },
    })
  }

  const handleSaveCustomField = async (field: CustomField, value: string) => {
    const updated = await peopleApi.updateCustomField(personId, field.id, value || undefined)
    setPerson((p) => p ? { ...p, customFields: p.customFields?.map((f) => f.id === updated.id ? updated : f) } : p)
  }

  const handleDeleteField = (field: CustomField) => {
    Modal.confirm({
      title: `Видалити поле "${field.name}"?`,
      okText: 'Видалити', okType: 'danger', cancelText: 'Скасувати',
      onOk: async () => {
        await peopleApi.deleteCustomField(personId, field.id)
        setPerson((p) => p ? { ...p, customFields: p.customFields?.filter((f) => f.id !== field.id) } : p)
      },
    })
  }

  const oversightUserName = (() => {
    const a = admins.find((a) => a.id === person.oversightUserId)
    return a ? [a.name, a.lastName].filter(Boolean).join(' ') : person.oversightUserName
  })()

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/people')}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{fullName || 'Людина'}</Title>
      </Space>

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
                <div style={{ fontSize: 18, fontWeight: 700 }}>{fullName || person.name}</div>
                {person.status && (
                  <Tag style={{ color: person.status.color, background: `${person.status.color}18`, borderColor: `${person.status.color}40`, marginTop: 8 }}>
                    {person.status.name}
                  </Tag>
                )}
                {person.primaryGroupName && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{person.primaryGroupName}</Text>
                )}
              </div>
              {canViewSensitive && (
                <Space>
                  {person.phone && <Button size="small" href={`tel:${person.phone}`}>Подзвонити</Button>}
                  {person.telegram && <Button size="small" href={`https://t.me/${person.telegram.replace('@', '')}`} target="_blank">Telegram</Button>}
                </Space>
              )}
              <Button icon={<MessageOutlined />} onClick={() => navigate(`/people/${personId}/activity`)} style={{ width: '100%' }}>
                Коментарі та активність
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete} style={{ width: '100%' }}>
                Видалити людину
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title="Особиста інформація"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftName(person.name); setDraftLastName(person.lastName ?? '')
              setDraftDob(person.dateOfBirth ?? ''); setDraftGender(person.gender ?? '')
              setDraftMarital(person.maritalStatus ?? ''); setDraftAddress(person.address ?? '')
              setDraftGroup(person.primaryGroupId ?? null); setPersonalOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Ім'я">{fullName || person.name}</Descriptions.Item>
              <Descriptions.Item label="Дата народження">{person.dateOfBirth ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Стать">{genderLabel(person.gender)}</Descriptions.Item>
              <Descriptions.Item label="Сімейний стан">{maritalLabel(person.maritalStatus)}</Descriptions.Item>
              <Descriptions.Item label="Адреса" span={2}>{person.address ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Домашня група" span={2}>{person.primaryGroupName ?? '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {canViewSensitive && (
            <Card
              title="Комунікація"
              extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
                setDraftPhone(person.phone ?? ''); setDraftEmail(person.email ?? '')
                setDraftTelegram(person.telegram ?? ''); setContactOpen(true)
              }} />}
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Телефон">{person.phone ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Telegram">{person.telegram ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>{person.email ?? '—'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card
            title="Церква"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftIsBaptized(person.isBaptized); setDraftChurch(person.church ?? '')
              setDraftMinistry(person.ministry ?? ''); setDraftIsBaptizedWithSpirit(person.isBaptizedWithSpirit)
              setChurchOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Водне хрещення">{person.isBaptized ? 'Так' : 'Ні'}</Descriptions.Item>
              <Descriptions.Item label="Хрещення Духом">{person.isBaptizedWithSpirit ? 'Так' : 'Ні'}</Descriptions.Item>
              <Descriptions.Item label="Церква">{person.church ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Служіння">{person.ministry ?? '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="Опіка"
            extra={<Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
              setDraftOversightUserId(person.oversightUserId ?? null); setDraftStatusId(person.status?.id ?? null)
              setOversightOpen(true)
            }} />}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Опікун">{oversightUserName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Статус">
                {person.status ? (
                  <Tag style={{ color: person.status.color, background: `${person.status.color}18`, borderColor: `${person.status.color}40` }}>
                    {person.status.name}
                  </Tag>
                ) : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <AttendanceGrid
            personId={personId}
            group={groups.find((g) => g.id === person.primaryGroupId)}
            attendance={attendance}
            loading={attendanceLoading}
          />

          {/* Custom fields */}
          <Card
            title="Додаткова інформація"
            extra={person.primaryGroupId ? (
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setNewFieldName(''); setAddFieldVisible(true) }}>
                Додати поле
              </Button>
            ) : undefined}
            style={{ marginTop: 16 }}
          >
            {!person.primaryGroupId && <Text type="secondary">Призначте людину до групи, щоб додавати поля</Text>}
            {person.primaryGroupId && (person.customFields ?? []).length === 0 && <Text type="secondary">Немає додаткових полів</Text>}
            {(person.customFields ?? []).map((field) => (
              <CustomFieldRow key={field.id} field={field}
                onSave={(v) => handleSaveCustomField(field, v)}
                onDelete={() => handleDeleteField(field)} />
            ))}
          </Card>
        </Col>
      </Row>

      {/* ── Modals ── */}
      <Modal open={personalOpen} title="Особиста інформація" onCancel={() => setPersonalOpen(false)}
        confirmLoading={saving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => {
          if (!draftName.trim()) { Modal.error({ title: "Ім'я обов'язкове" }); return }
          const ok = await doSave({
            name: draftName.trim(), lastName: draftLastName.trim() || undefined,
            dateOfBirth: draftDob || undefined, gender: draftGender || undefined,
            maritalStatus: draftMarital || undefined, address: draftAddress.trim() || undefined,
            primaryGroupId: draftGroup ?? undefined,
          })
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
          <div>
            <div style={labelStyle}>Домашня група</div>
            <Select value={draftGroup ?? undefined} onChange={(v) => setDraftGroup(v ?? null)} style={{ width: '100%' }} allowClear placeholder="— не вибрано —">
              {groups.map((g) => <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>)}
            </Select>
          </div>
        </div>
      </Modal>

      <Modal open={contactOpen} title="Комунікація" onCancel={() => setContactOpen(false)}
        confirmLoading={saving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => {
          const ok = await doSave({ phone: draftPhone.trim() || undefined, email: draftEmail.trim() || undefined, telegram: draftTelegram.trim() || undefined })
          if (ok) setContactOpen(false)
        }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><div style={labelStyle}>Телефон</div><Input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} placeholder="+380..." /></div>
          <div><div style={labelStyle}>Email</div><Input value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} placeholder="email@example.com" /></div>
          <div><div style={labelStyle}>Telegram</div><Input value={draftTelegram} onChange={(e) => setDraftTelegram(e.target.value)} placeholder="@username" /></div>
        </div>
      </Modal>

      <Modal open={churchOpen} title="Церква" onCancel={() => setChurchOpen(false)}
        confirmLoading={saving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => {
          const ok = await doSave({ isBaptized: draftIsBaptized, church: draftChurch.trim() || undefined, ministry: draftMinistry.trim() || undefined, isBaptizedWithSpirit: draftIsBaptizedWithSpirit })
          if (ok) setChurchOpen(false)
        }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Водне хрещення</Text><Switch checked={draftIsBaptized} onChange={setDraftIsBaptized} />
          </div>
          <Divider style={{ margin: '4px 0' }} />
          <div><div style={labelStyle}>Церква</div><Input value={draftChurch} onChange={(e) => setDraftChurch(e.target.value)} /></div>
          <div><div style={labelStyle}>Служіння</div><Input value={draftMinistry} onChange={(e) => setDraftMinistry(e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Хрещення Духом</Text><Switch checked={draftIsBaptizedWithSpirit} onChange={setDraftIsBaptizedWithSpirit} />
          </div>
        </div>
      </Modal>

      <Modal open={oversightOpen} title="Опіка" onCancel={() => setOversightOpen(false)}
        confirmLoading={saving} okText="Зберегти" cancelText="Скасувати"
        onOk={async () => {
          const ok = await doSave({ oversightUserId: draftOversightUserId, personStatusId: draftStatusId })
          if (ok) setOversightOpen(false)
        }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>Опікун</div>
            <Select value={draftOversightUserId ?? undefined} onChange={(v) => setDraftOversightUserId(v ?? null)} style={{ width: '100%' }} allowClear placeholder="— не вибрано —">
              {admins.map((a) => <Select.Option key={a.id} value={a.id}>{[a.name, a.lastName].filter(Boolean).join(' ')}</Select.Option>)}
            </Select>
          </div>
          <div>
            <div style={labelStyle}>Статус</div>
            <Select value={draftStatusId ?? undefined} onChange={(v) => setDraftStatusId(v ?? null)} style={{ width: '100%' }} allowClear placeholder="— без статусу —">
              {statuses.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </div>
        </div>
      </Modal>

      <Modal open={addFieldVisible} title="Нове поле" onCancel={() => setAddFieldVisible(false)}
        okText="Додати" cancelText="Скасувати"
        onOk={async () => {
          if (!newFieldName.trim()) return
          try {
            const field = await peopleApi.addCustomField(personId, newFieldName.trim())
            setPerson((p) => p ? { ...p, customFields: [...(p.customFields ?? []), field] } : p)
            setAddFieldVisible(false)
          } catch {
            Modal.error({ title: 'Помилка додавання поля' })
          }
        }}
        destroyOnClose>
        <Input placeholder="Назва поля" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} autoFocus />
      </Modal>
    </div>
  )
}

// ── Custom field row ──────────────────────────────────────────────────────────

function CustomFieldRow({ field, onSave, onDelete }: { field: CustomField; onSave: (v: string) => Promise<void>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(field.value ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } finally { setSaving(false); setEditing(false) }
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text type="secondary" style={{ flex: 1, fontSize: 12 }}>{field.name}</Text>
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onDelete} />
      </div>
      {editing ? (
        <Space.Compact style={{ width: '100%' }}>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Значення" />
          <Button loading={saving} type="primary" onClick={save}>Зберегти</Button>
          <Button onClick={() => setEditing(false)}>Скасувати</Button>
        </Space.Compact>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: field.value ? undefined : 'rgba(0,0,0,0.35)' }}>{field.value || '—'}</Text>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setDraft(field.value ?? ''); setEditing(true) }} />
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
}
