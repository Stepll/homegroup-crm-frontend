import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Button, Toast, SpinLoading, Popup, Input, Switch } from 'antd-mobile'
import { EditSOutline } from 'antd-mobile-icons'
import { adminsApi } from '@/api/admins'
import { attendanceApi } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { useAuth } from '@/store/auth'
import type { Admin, Group, AttendanceRecord } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={fieldLabel}>{label}</span>
      <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{children}</span>
    </div>
  )
}

// ── BlockCard ─────────────────────────────────────────────────────────────────

function BlockCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div style={block}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={blockLabel}>{title}</span>
        <button onClick={onEdit} style={iconBtn}><EditSOutline /></button>
      </div>
      {children}
    </div>
  )
}

// ── PopupForm ─────────────────────────────────────────────────────────────────

function PopupForm({ visible, title, onClose, onSave, saving, children }: {
  visible: boolean; title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode
}) {
  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '20px 16px 36px', maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{title}</div>
      {children}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button block loading={saving} onClick={onSave}
          style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
          Зберегти
        </Button>
        <Button block fill="outline" onClick={onClose}>Скасувати</Button>
      </div>
    </Popup>
  )
}

// ── FormField ─────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={fieldLabel}>{label}</div>
      <div style={inputWrap}>{children}</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProfilePage() {
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
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  const load = () =>
    Promise.all([adminsApi.getMe(), personStatusesApi.getAll(), groupsApi.getAll()])
      .then(([a, s, g]) => { setAdmin(a); setStatuses(s); setGroups(g) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar back={null}>Профіль</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const baseProfile = () => ({
    phone: admin.phone,
    telegram: admin.telegram,
    notes: admin.notes,
    gender: admin.gender,
    maritalStatus: admin.maritalStatus,
    address: admin.address,
    dateOfBirth: admin.dateOfBirth,
    isBaptized: admin.isBaptized,
    church: admin.church,
    ministry: admin.ministry,
    isBaptizedWithSpirit: admin.isBaptizedWithSpirit,
    personStatusId: admin.status?.id,
  })

  const doSaveProfile = async (patch: object) => {
    setSaving(true)
    try {
      const updated = await adminsApi.updateProfile(admin.id, { ...baseProfile(), ...patch })
      setAdmin(updated)
      return true
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
      return false
    } finally {
      setSaving(false)
    }
  }

  // ── Open handlers ──────────────────────────────────────────────────────────

  const openPersonal = () => {
    setDraftName(admin.name); setDraftLastName(admin.lastName ?? '')
    setDraftDob(admin.dateOfBirth ?? ''); setDraftGender(admin.gender ?? '')
    setDraftMarital(admin.maritalStatus ?? ''); setDraftAddress(admin.address ?? '')
    setDraftNotes(admin.notes ?? '')
    setPersonalOpen(true)
  }
  const openContact = () => {
    setDraftPhone(admin.phone ?? ''); setDraftTelegram(admin.telegram ?? '')
    setContactOpen(true)
  }
  const openChurch = () => {
    setDraftIsBaptized(admin.isBaptized); setDraftChurch(admin.church ?? '')
    setDraftMinistry(admin.ministry ?? ''); setDraftIsBaptizedWithSpirit(admin.isBaptizedWithSpirit)
    setDraftStatusId(admin.status?.id)
    setChurchOpen(true)
  }

  // ── Save handlers ──────────────────────────────────────────────────────────

  const savePersonal = async () => {
    if (!draftName.trim()) { Toast.show({ content: "Ім'я обов'язкове", icon: 'fail' }); return }
    const ok = await doSaveProfile({
      name: draftName.trim(), lastName: draftLastName.trim() || undefined,
      dateOfBirth: draftDob || undefined, gender: draftGender || undefined,
      maritalStatus: draftMarital || undefined, address: draftAddress.trim() || undefined,
      notes: draftNotes.trim() || undefined,
    })
    if (ok) setPersonalOpen(false)
  }
  const saveContact = async () => {
    const ok = await doSaveProfile({
      phone: draftPhone.trim() || undefined,
      telegram: draftTelegram.trim() || undefined,
    })
    if (ok) setContactOpen(false)
  }
  const saveChurch = async () => {
    const ok = await doSaveProfile({
      isBaptized: draftIsBaptized,
      church: draftChurch.trim() || undefined,
      ministry: draftMinistry.trim() || undefined,
      isBaptizedWithSpirit: draftIsBaptizedWithSpirit,
      personStatusId: draftStatusId,
    })
    if (ok) setChurchOpen(false)
  }
  const handleSetPassword = async () => {
    if (!newPwd.trim()) return
    setPwdSaving(true)
    try {
      await adminsApi.setMyPassword(newPwd)
      Toast.show({ content: 'Пароль змінено', icon: 'success' })
      setPwdOpen(false); setNewPwd('')
    } catch {
      Toast.show({ content: 'Помилка зміни пароля', icon: 'fail' })
    }
    setPwdSaving(false)
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar back={null}>Профіль</NavBar>

      {/* ── Hero ── */}
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

        {/* Communication buttons */}
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

        {/* ── Особиста інформація ── */}
        <BlockCard title="Особиста інформація" onEdit={openPersonal}>
          <InfoRow label="Ім'я">{admin.name} {admin.lastName ?? ''}</InfoRow>
          <InfoRow label="Дата народження">{admin.dateOfBirth ?? '—'}</InfoRow>
          <InfoRow label="Стать">{genderLabel(admin.gender)}</InfoRow>
          <InfoRow label="Сімейний стан">{maritalLabel(admin.maritalStatus)}</InfoRow>
          <InfoRow label="Адреса">{admin.address ?? '—'}</InfoRow>
          {admin.notes && <InfoRow label="Нотатки">{admin.notes}</InfoRow>}
        </BlockCard>

        {/* ── Комунікація ── */}
        <BlockCard title="Комунікація" onEdit={openContact}>
          <InfoRow label="Телефон">{admin.phone ?? '—'}</InfoRow>
          <InfoRow label="Email">{admin.email}</InfoRow>
          <InfoRow label="Telegram">{admin.telegram ?? '—'}</InfoRow>
        </BlockCard>

        {/* ── Церква ── */}
        <BlockCard title="Церква" onEdit={openChurch}>
          <InfoRow label="Статус">{admin.status?.name ?? '—'}</InfoRow>
          <InfoRow label="Хрещення">{admin.isBaptized ? 'Охрещений(а)' : 'Не охрещений(а)'}</InfoRow>
          <InfoRow label="Церква">{admin.church ?? '—'}</InfoRow>
          <InfoRow label="Служіння">{admin.ministry ?? '—'}</InfoRow>
          <InfoRow label="Хрещення Духом">{admin.isBaptizedWithSpirit ? 'Так' : 'Ні'}</InfoRow>
        </BlockCard>

        {/* ── Відвідуваність ── */}
        <AttendanceGrid
          userId={admin.id}
          group={groups.find((g) => g.id === admin.primaryGroupId)}
          attendance={attendance}
          loading={attendanceLoading}
          noGroupMessage="Не прив'язаний до групи"
        />

        {/* ── Безпека ── */}
        <div style={block}>
          <span style={blockLabel}>Безпека</span>
          <div style={{ padding: '12px 0' }}>
            <Button size="small" fill="outline"
              style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
              onClick={() => { setNewPwd(''); setPwdOpen(true) }}>
              Змінити пароль
            </Button>
          </div>
        </div>

        {/* ── Logout ── */}
        <Button block onClick={handleLogout} style={{
          '--border-color': 'var(--color-border)', '--text-color': 'var(--color-error)',
          '--border-radius': 'var(--radius-md)', height: 48,
          fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 8,
        } as React.CSSProperties}>
          Вийти
        </Button>
      </div>

      {/* ── Popup: Особиста ── */}
      <PopupForm visible={personalOpen} title="Особиста інформація" onClose={() => setPersonalOpen(false)} onSave={savePersonal} saving={saving}>
        <FormField label="Ім'я">
          <Input value={draftName} onChange={setDraftName} placeholder="Ім'я" />
        </FormField>
        <FormField label="Прізвище">
          <Input value={draftLastName} onChange={setDraftLastName} placeholder="Прізвище" />
        </FormField>
        <FormField label="Дата народження">
          <input type="date" value={draftDob} onChange={(e) => setDraftDob(e.target.value)} style={nativeInput} />
        </FormField>
        <FormField label="Стать">
          <select value={draftGender} onChange={(e) => setDraftGender(e.target.value)} style={nativeInput}>
            <option value="">— не вказано —</option>
            <option value="Male">Чоловіча</option>
            <option value="Female">Жіноча</option>
          </select>
        </FormField>
        <FormField label="Сімейний стан">
          <select value={draftMarital} onChange={(e) => setDraftMarital(e.target.value)} style={nativeInput}>
            <option value="">— не вказано —</option>
            <option value="Single">Не в шлюбі</option>
            <option value="Married">В шлюбі</option>
          </select>
        </FormField>
        <FormField label="Адреса">
          <Input value={draftAddress} onChange={setDraftAddress} placeholder="Адреса" />
        </FormField>
        <FormField label="Нотатки">
          <textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} rows={3}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, resize: 'none', color: 'var(--color-text)', boxSizing: 'border-box' }}
            placeholder="Нотатки..." />
        </FormField>
      </PopupForm>

      {/* ── Popup: Комунікація ── */}
      <PopupForm visible={contactOpen} title="Комунікація" onClose={() => setContactOpen(false)} onSave={saveContact} saving={saving}>
        <FormField label="Телефон">
          <Input value={draftPhone} onChange={setDraftPhone} placeholder="+380..." type="tel" />
        </FormField>
        <FormField label="Telegram">
          <Input value={draftTelegram} onChange={setDraftTelegram} placeholder="@username" />
        </FormField>
      </PopupForm>

      {/* ── Popup: Церква ── */}
      <PopupForm visible={churchOpen} title="Церква" onClose={() => setChurchOpen(false)} onSave={saveChurch} saving={saving}>
        <FormField label="Статус">
          <select value={draftStatusId ?? ''} onChange={(e) => setDraftStatusId(e.target.value ? Number(e.target.value) : undefined)} style={nativeInput}>
            <option value="">— без статусу —</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={fieldLabel}>Хрещений(а)</span>
          <Switch checked={draftIsBaptized} onChange={setDraftIsBaptized} />
        </div>
        <FormField label="Церква">
          <Input value={draftChurch} onChange={setDraftChurch} placeholder="Назва церкви" />
        </FormField>
        <FormField label="Служіння">
          <Input value={draftMinistry} onChange={setDraftMinistry} placeholder="Служіння" />
        </FormField>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={fieldLabel}>Хрещення Духом</span>
          <Switch checked={draftIsBaptizedWithSpirit} onChange={setDraftIsBaptizedWithSpirit} />
        </div>
      </PopupForm>

      {/* ── Popup: Пароль ── */}
      <Popup visible={pwdOpen} onMaskClick={() => setPwdOpen(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Новий пароль</div>
        <div style={inputWrap}>
          <Input placeholder="Введіть новий пароль" type="password" value={newPwd} onChange={setNewPwd} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button block loading={pwdSaving} onClick={handleSetPassword}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Зберегти
          </Button>
          <Button block fill="outline" onClick={() => setPwdOpen(false)}>Скасувати</Button>
        </div>
      </Popup>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const nativeInput: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none', background: 'transparent',
  fontSize: 15, color: 'var(--color-text)',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 4, cursor: 'pointer',
  color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', fontSize: 16,
}
