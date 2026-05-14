import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Button, Toast, SpinLoading } from 'antd-mobile'
import { adminsApi } from '@/api/admins'
import { attendanceApi } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import type { Admin, Group, AttendanceRecord } from '@/types'

const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={fieldLabel}>{label}</span>
      <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{children}</span>
    </div>
  )
}

function BlockCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={block}>
      <span style={blockLabel}>{title}</span>
      {children}
    </div>
  )
}

export function AdminProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminId = Number(id)

  const [admin, setAdmin] = useState<Admin | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  useEffect(() => {
    Promise.all([adminsApi.getById(adminId), groupsApi.getAll()])
      .then(([a, g]) => { setAdmin(a); setGroups(g) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
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

  if (loading || !admin) {
    return (
      <div>
        <NavBar onBack={() => navigate('/people')}>Профіль</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/people')}>{fullName || 'Профіль'}</NavBar>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 8px', gap: 10 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#fff',
          boxShadow: '0 4px 16px rgba(42,175,202,0.35)',
        }}>
          {initials}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            {fullName || admin.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
            {admin.roles.map((r) => (
              <span key={r.id} style={{ fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 8px', color: r.color, background: `${r.color}18` }}>
                {r.name}
              </span>
            ))}
          </div>
          {admin.primaryGroupName && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{admin.primaryGroupName}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {admin.phone && (
            <a href={`tel:${admin.phone}`} style={{ textDecoration: 'none' }}>
              <Button size="small" fill="outline"
                style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}>
                Подзвонити
              </Button>
            </a>
          )}
          {admin.telegram && (
            <a href={`https://t.me/${admin.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <Button size="small" fill="outline"
                style={{ '--border-color': '#2AAFCA', '--text-color': '#2AAFCA' } as React.CSSProperties}>
                Telegram
              </Button>
            </a>
          )}
          {!admin.phone && !admin.telegram && (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Контакти не вказані</span>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        <BlockCard title="Особиста інформація">
          <InfoRow label="Дата народження">{admin.dateOfBirth ?? '—'}</InfoRow>
          <InfoRow label="Стать">{genderLabel(admin.gender)}</InfoRow>
          <InfoRow label="Сімейний стан">{maritalLabel(admin.maritalStatus)}</InfoRow>
          <InfoRow label="Адреса">{admin.address ?? '—'}</InfoRow>
          {admin.notes && <InfoRow label="Нотатки">{admin.notes}</InfoRow>}
        </BlockCard>

        <BlockCard title="Комунікація">
          <InfoRow label="Телефон">{admin.phone ?? '—'}</InfoRow>
          <InfoRow label="Email">{admin.email}</InfoRow>
          <InfoRow label="Telegram">{admin.telegram ?? '—'}</InfoRow>
        </BlockCard>

        <BlockCard title="Церква">
          <InfoRow label="Статус">{admin.status?.name ?? '—'}</InfoRow>
          <InfoRow label="Хрещення">{admin.isBaptized ? 'Охрещений(а)' : 'Не охрещений(а)'}</InfoRow>
          <InfoRow label="Церква">{admin.church ?? '—'}</InfoRow>
          <InfoRow label="Служіння">{admin.ministry ?? '—'}</InfoRow>
          <InfoRow label="Хрещення Духом">{admin.isBaptizedWithSpirit ? 'Так' : 'Ні'}</InfoRow>
        </BlockCard>

        <AttendanceGrid
          userId={adminId}
          group={groups.find((g) => g.id === admin.primaryGroupId)}
          attendance={attendance}
          loading={attendanceLoading}
          noGroupMessage="Адмін не прив'язаний до групи"
        />
      </div>
    </div>
  )
}

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '12px 16px', marginTop: 16,
  boxShadow: 'var(--shadow-sm)',
}
const blockLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, display: 'block', marginBottom: 4,
}
const fieldLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500,
}
