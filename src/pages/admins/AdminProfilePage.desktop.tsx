import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Spin, Typography, Space, Tag, Row, Col, Descriptions } from 'antd'
import { ArrowLeftOutlined, MessageOutlined } from '@ant-design/icons'
import { adminsApi } from '@/api/admins'
import { attendanceApi } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { AdminTasksBlock } from '@/components/AdminTasksBlock'
import { usePermission } from '@/hooks/usePermission'
import type { Admin, Group, AttendanceRecord } from '@/types'

const { Title, Text } = Typography
const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'

export function AdminProfilePageDesktop() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminId = Number(id)
  const canViewSensitive = usePermission('admins.viewSensitive')

  const [admin, setAdmin] = useState<Admin | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  useEffect(() => {
    Promise.all([adminsApi.getById(adminId), groupsApi.getAll()])
      .then(([a, g]) => { setAdmin(a); setGroups(g) })
      .finally(() => setLoading(false))
  }, [adminId])

  useEffect(() => {
    if (!admin?.primaryGroupId) return
    setAttendanceLoading(true)
    const from = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().slice(0, 10)
    attendanceApi.getByGroup(admin.primaryGroupId, from)
      .then(setAttendance)
      .finally(() => setAttendanceLoading(false))
  }, [admin?.primaryGroupId])

  if (loading || !admin) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>{fullName || admin.name}</Title>
      </Space>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 12 }}>
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
              {canViewSensitive && (
                <Space>
                  {admin.phone && <Button size="small" href={`tel:${admin.phone}`}>Подзвонити</Button>}
                  {admin.telegram && <Button size="small" href={`https://t.me/${admin.telegram.replace('@', '')}`} target="_blank">Telegram</Button>}
                </Space>
              )}
              <Button icon={<MessageOutlined />} onClick={() => navigate(`/admins/${adminId}/activity`)} style={{ width: '100%', marginTop: 8 }}>
                Коментарі та активність
              </Button>
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <AdminTasksBlock adminId={adminId} />
          </div>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Особиста інформація" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Дата народження">{admin.dateOfBirth ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Стать">{genderLabel(admin.gender)}</Descriptions.Item>
              <Descriptions.Item label="Сімейний стан">{maritalLabel(admin.maritalStatus)}</Descriptions.Item>
              <Descriptions.Item label="Адреса" span={2}>{admin.address ?? '—'}</Descriptions.Item>
              {admin.notes && <Descriptions.Item label="Нотатки" span={2}>{admin.notes}</Descriptions.Item>}
            </Descriptions>
          </Card>

          {canViewSensitive && (
            <Card title="Комунікація" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Телефон">{admin.phone ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Telegram">{admin.telegram ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>{admin.email}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card title="Церква" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Статус">
                {admin.status ? (
                  <Tag style={{ color: admin.status.color, background: `${admin.status.color}18`, borderColor: `${admin.status.color}40` }}>
                    {admin.status.name}
                  </Tag>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Хрещення">{admin.isBaptized ? 'Охрещений(а)' : 'Ні'}</Descriptions.Item>
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
    </div>
  )
}
