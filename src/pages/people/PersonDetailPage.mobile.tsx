import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, Button, Toast, SpinLoading, Dialog, Popup, Switch } from 'antd-mobile'
import { EditSOutline, DeleteOutline, AddOutline } from 'antd-mobile-icons'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import { adminsApi } from '@/api/admins'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import { attendanceApi } from '@/api/attendance'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { usePermission } from '@/hooks/usePermission'
import type { Person, CustomField, Group, Admin, AttendanceRecord } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

const genderLabel = (v?: string) => v === 'Male' ? 'Чоловіча' : v === 'Female' ? 'Жіноча' : '—'
const maritalLabel = (v?: string) => v === 'Married' ? 'В шлюбі' : v === 'Single' ? 'Не в шлюбі' : '—'

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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

// ── Main page ─────────────────────────────────────────────────────────────────

export function PersonDetailPageMobile() {
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

  // Popup visibility
  const [personalOpen, setPersonalOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [churchOpen, setChurchOpen] = useState(false)
  const [oversightOpen, setOversightOpen] = useState(false)
  const [addFieldVisible, setAddFieldVisible] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')

  // Drafts — особиста
  const [draftName, setDraftName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [draftDob, setDraftDob] = useState('')
  const [draftGender, setDraftGender] = useState('')
  const [draftMarital, setDraftMarital] = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftGroup, setDraftGroup] = useState<number | null>(null)

  // Drafts — комунікація
  const [draftPhone, setDraftPhone] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftTelegram, setDraftTelegram] = useState('')

  // Drafts — церква
  const [draftIsBaptized, setDraftIsBaptized] = useState(false)
  const [draftChurch, setDraftChurch] = useState('')
  const [draftMinistry, setDraftMinistry] = useState('')
  const [draftIsBaptizedWithSpirit, setDraftIsBaptizedWithSpirit] = useState(false)

  // Drafts — опіка
  const [draftOversightUserId, setDraftOversightUserId] = useState<number | null>(null)
  const [draftStatusId, setDraftStatusId] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([
      peopleApi.getById(personId),
      groupsApi.getAll(),
      adminsApi.getAll().catch(() => [] as Admin[]),
      personStatusesApi.getAll(),
    ])
      .then(([p, g, a, s]) => { setPerson(p); setGroups(g); setAdmins(a); setStatuses(s) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [personId])

  useEffect(() => {
    if (!person?.primaryGroupId) return
    const today = new Date()
    const from = new Date(today.getFullYear(), today.getMonth() - 11, 1)
    setAttendanceLoading(true)
    attendanceApi.getByGroup(person.primaryGroupId, fmtDate(from), fmtDate(today))
      .then(setAttendance)
      .catch(() => {})
      .finally(() => setAttendanceLoading(false))
  }, [person?.primaryGroupId])

  if (loading || !person) {
    return (
      <div>
        <NavBar onBack={() => navigate('/people')}>Людина</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  const basePayload = () => ({
    name: person.name,
    lastName: person.lastName,
    phone: person.phone,
    email: person.email,
    telegram: person.telegram,
    notes: person.notes,
    gender: person.gender,
    maritalStatus: person.maritalStatus,
    address: person.address,
    dateOfBirth: person.dateOfBirth,
    isBaptized: person.isBaptized,
    church: person.church,
    ministry: person.ministry,
    isBaptizedWithSpirit: person.isBaptizedWithSpirit,
    personStatusId: person.status?.id ?? null,
    oversightInfo: person.oversightInfo,
    oversightUserId: person.oversightUserId ?? null,
    primaryGroupId: person.primaryGroupId,
  })

  const doSave = async (patch: object) => {
    setSaving(true)
    try {
      const updated = await peopleApi.update(personId, { ...basePayload(), ...patch })
      setPerson(updated)
      return true
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
      return false
    } finally {
      setSaving(false)
    }
  }

  // Open handlers
  const openPersonal = () => {
    setDraftName(person.name); setDraftLastName(person.lastName ?? '')
    setDraftDob(person.dateOfBirth ?? ''); setDraftGender(person.gender ?? '')
    setDraftMarital(person.maritalStatus ?? ''); setDraftAddress(person.address ?? '')
    setDraftGroup(person.primaryGroupId ?? null)
    setPersonalOpen(true)
  }
  const openContact = () => {
    setDraftPhone(person.phone ?? ''); setDraftEmail(person.email ?? ''); setDraftTelegram(person.telegram ?? '')
    setContactOpen(true)
  }
  const openChurch = () => {
    setDraftIsBaptized(person.isBaptized); setDraftChurch(person.church ?? '')
    setDraftMinistry(person.ministry ?? ''); setDraftIsBaptizedWithSpirit(person.isBaptizedWithSpirit)
    setChurchOpen(true)
  }
  const openOversight = () => {
    setDraftOversightUserId(person.oversightUserId ?? null); setDraftStatusId(person.status?.id ?? null)
    setOversightOpen(true)
  }

  // Save handlers
  const savePersonal = async () => {
    if (!draftName.trim()) { Toast.show({ content: "Ім'я обов'язкове", icon: 'fail' }); return }
    const ok = await doSave({
      name: draftName.trim(), lastName: draftLastName.trim() || undefined,
      dateOfBirth: draftDob || undefined, gender: draftGender || undefined,
      maritalStatus: draftMarital || undefined, address: draftAddress.trim() || undefined,
      primaryGroupId: draftGroup ?? undefined,
    })
    if (ok) setPersonalOpen(false)
  }
  const saveContact = async () => {
    const ok = await doSave({
      phone: draftPhone.trim() || undefined,
      email: draftEmail.trim() || undefined,
      telegram: draftTelegram.trim() || undefined,
    })
    if (ok) setContactOpen(false)
  }
  const saveChurch = async () => {
    const ok = await doSave({
      isBaptized: draftIsBaptized, church: draftChurch.trim() || undefined,
      ministry: draftMinistry.trim() || undefined, isBaptizedWithSpirit: draftIsBaptizedWithSpirit,
    })
    if (ok) setChurchOpen(false)
  }
  const saveOversight = async () => {
    const ok = await doSave({ oversightUserId: draftOversightUserId, personStatusId: draftStatusId })
    if (ok) setOversightOpen(false)
  }

  const fullName = [person.name, person.lastName].filter(Boolean).join(' ')

  const handleDelete = async () => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити людину?',
      content: `"${fullName}" буде видалено назавжди.`,
      confirmText: 'Видалити', cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await peopleApi.remove(personId)
      Toast.show({ content: 'Видалено', icon: 'success' })
      navigate('/people', { replace: true })
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  const handleSaveCustomField = async (field: CustomField, value: string) => {
    const updated = await peopleApi.updateCustomField(personId, field.id, value || undefined)
    setPerson((p) => p ? { ...p, customFields: p.customFields?.map((f) => f.id === updated.id ? updated : f) } : p)
  }
  const handleDeleteField = async (field: CustomField) => {
    const confirmed = await Dialog.confirm({ title: `Видалити поле "${field.name}"?`, confirmText: 'Видалити', cancelText: 'Скасувати' })
    if (!confirmed) return
    await peopleApi.deleteCustomField(personId, field.id)
    setPerson((p) => p ? { ...p, customFields: p.customFields?.filter((f) => f.id !== field.id) } : p)
  }

  const oversightUserName = (() => {
    const a = admins.find((a) => a.id === person.oversightUserId)
    return a ? [a.name, a.lastName].filter(Boolean).join(' ') : person.oversightUserName
  })()

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate('/people')}>{fullName || 'Людина'}</NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* ── Особиста інформація ── */}
        <BlockCard title="Особиста інформація" onEdit={openPersonal}>
          <InfoRow label="Ім'я">{person.name} {person.lastName ?? ''}</InfoRow>
          <InfoRow label="Дата народження">{person.dateOfBirth ?? '—'}</InfoRow>
          <InfoRow label="Стать">{genderLabel(person.gender)}</InfoRow>
          <InfoRow label="Сімейний стан">{maritalLabel(person.maritalStatus)}</InfoRow>
          <InfoRow label="Адреса">{person.address ?? '—'}</InfoRow>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fieldLabel}>Домашня група</span>
            <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{person.primaryGroupName ?? '—'}</span>
          </div>
        </BlockCard>

        {/* ── Коментарі та активність ── */}
        <button
          onClick={() => navigate(`/people/${personId}/activity`)}
          style={{
            ...block, width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Коментарі та активність</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* ── Комунікація ── */}
        {canViewSensitive && (
          <BlockCard title="Комунікація" onEdit={openContact}>
            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={fieldLabel}>Телефон</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{person.phone ?? '—'}</span>
                {person.phone && (
                  <a href={`tel:${person.phone}`} style={{ ...iconBtn, color: 'var(--color-primary)', textDecoration: 'none' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
            <InfoRow label="Email">{person.email ?? '—'}</InfoRow>
            <div style={{ padding: '8px 0' }}>
              <span style={fieldLabel}>Telegram</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{person.telegram ?? '—'}</span>
                {person.telegram && (
                  <a
                    href={`https://t.me/${person.telegram.replace(/^@/, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ ...iconBtn, color: '#2AAFCA', textDecoration: 'none' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.11 14.481l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.838.078z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </BlockCard>
        )}

        {/* ── Церква ── */}
        <BlockCard title="Церква" onEdit={openChurch}>
          <InfoRow label="Водне хрещення">{person.isBaptized ? 'Так' : 'Ні'}</InfoRow>
          <InfoRow label="Церква">{person.church ?? '—'}</InfoRow>
          <InfoRow label="Служіння">{person.ministry ?? '—'}</InfoRow>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fieldLabel}>Хрещення Духом</span>
            <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{person.isBaptizedWithSpirit ? 'Так' : 'Ні'}</span>
          </div>
        </BlockCard>

        {/* ── Опіка ── */}
        <BlockCard title="Опіка" onEdit={openOversight}>
          <InfoRow label="Опікун">{oversightUserName ?? '—'}</InfoRow>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fieldLabel}>Статус</span>
            {person.status ? (
              <span style={{
                alignSelf: 'flex-start', padding: '2px 10px', borderRadius: 20,
                background: person.status.color + '22', color: person.status.color, fontWeight: 600, fontSize: 13,
              }}>{person.status.name}</span>
            ) : <span style={{ fontSize: 15, color: 'var(--color-text-tertiary)' }}>—</span>}
          </div>
        </BlockCard>

        {/* ── Відвідуваність ── */}
        <AttendanceGrid
          personId={personId}
          group={groups.find(g => g.id === person.primaryGroupId)}
          attendance={attendance}
          loading={attendanceLoading}
        />

        {/* ── Додаткова інформація ── */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={blockLabel}>Додаткова інформація</span>
            {person.primaryGroupId && (
              <button onClick={() => { setNewFieldName(''); setAddFieldVisible(true) }}
                style={{ ...iconBtn, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
                <AddOutline /> Додати
              </button>
            )}
          </div>
          {!person.primaryGroupId && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Призначте людину до групи, щоб додавати поля</span>}
          {person.primaryGroupId && (person.customFields ?? []).length === 0 && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Немає додаткових полів</span>}
          {(person.customFields ?? []).map((field) => (
            <CustomFieldRow key={field.id} field={field}
              onSave={(v) => handleSaveCustomField(field, v)}
              onDelete={() => handleDeleteField(field)} />
          ))}
        </div>

        {/* Delete */}
        <Button block onClick={handleDelete}
          style={{
            '--background-color': 'transparent', '--border-color': 'var(--color-error)',
            '--text-color': 'var(--color-error)', '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 8,
          } as React.CSSProperties}>
          Видалити людину
        </Button>
      </div>

      {/* ── Popup: Особиста інформація ── */}
      <PopupForm visible={personalOpen} title="Особиста інформація" onClose={() => setPersonalOpen(false)} onSave={savePersonal} saving={saving}>
        <FormField label="Ім'я">
          <Input value={draftName} onChange={setDraftName} placeholder="Ім'я" />
        </FormField>
        <FormField label="Прізвище">
          <Input value={draftLastName} onChange={setDraftLastName} placeholder="Прізвище" />
        </FormField>
        <FormField label="Дата народження">
          <input type="date" value={draftDob} onChange={(e) => setDraftDob(e.target.value)} style={{ ...nativeSelect, padding: 0 }} />
        </FormField>
        <FormField label="Стать">
          <select value={draftGender} onChange={(e) => setDraftGender(e.target.value)} style={nativeSelect}>
            <option value="">— не вибрано —</option>
            <option value="Male">Чоловіча</option>
            <option value="Female">Жіноча</option>
          </select>
        </FormField>
        <FormField label="Сімейний стан">
          <select value={draftMarital} onChange={(e) => setDraftMarital(e.target.value)} style={nativeSelect}>
            <option value="">— не вибрано —</option>
            <option value="Single">Не в шлюбі</option>
            <option value="Married">В шлюбі</option>
          </select>
        </FormField>
        <FormField label="Адреса">
          <Input value={draftAddress} onChange={setDraftAddress} placeholder="Адреса" />
        </FormField>
      </PopupForm>

      {/* ── Popup: Комунікація ── */}
      <PopupForm visible={contactOpen} title="Комунікація" onClose={() => setContactOpen(false)} onSave={saveContact} saving={saving}>
        <FormField label="Телефон">
          <Input value={draftPhone} onChange={setDraftPhone} placeholder="+380..." type="tel" />
        </FormField>
        <FormField label="Email">
          <Input value={draftEmail} onChange={setDraftEmail} placeholder="email@example.com" type="email" />
        </FormField>
        <FormField label="Telegram">
          <Input value={draftTelegram} onChange={setDraftTelegram} placeholder="@username" autoComplete="off" />
        </FormField>
      </PopupForm>

      {/* ── Popup: Церква ── */}
      <PopupForm visible={churchOpen} title="Церква" onClose={() => setChurchOpen(false)} onSave={saveChurch} saving={saving}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...inputWrap }}>
            <span style={{ fontSize: 15, color: 'var(--color-text)' }}>Чи приймав водне хрещення?</span>
            <Switch checked={draftIsBaptized} onChange={setDraftIsBaptized} />
          </div>
        </div>
        <FormField label="В якій церкві прописаний">
          <Input value={draftChurch} onChange={setDraftChurch} placeholder="Назва церкви" />
        </FormField>
        <FormField label="Яке служіння в церкві">
          <Input value={draftMinistry} onChange={setDraftMinistry} placeholder="Служіння" />
        </FormField>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...inputWrap }}>
            <span style={{ fontSize: 15, color: 'var(--color-text)' }}>Хрещений Духом з ознакою інших мов?</span>
            <Switch checked={draftIsBaptizedWithSpirit} onChange={setDraftIsBaptizedWithSpirit} />
          </div>
        </div>
      </PopupForm>

      {/* ── Popup: Опіка ── */}
      <PopupForm visible={oversightOpen} title="Опіка" onClose={() => setOversightOpen(false)} onSave={saveOversight} saving={saving}>
        <FormField label="Опікун">
          <select value={draftOversightUserId ?? ''} onChange={(e) => setDraftOversightUserId(e.target.value ? Number(e.target.value) : null)} style={nativeSelect}>
            <option value="">— не вибрано —</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{[a.name, a.lastName].filter(Boolean).join(' ')}</option>)}
          </select>
        </FormField>
        <FormField label="Статус">
          <select value={draftStatusId ?? ''} onChange={(e) => setDraftStatusId(e.target.value ? Number(e.target.value) : null)} style={nativeSelect}>
            <option value="">— не вибрано —</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
      </PopupForm>

      {/* ── Popup: Нове поле ── */}
      <Popup visible={addFieldVisible} onMaskClick={() => setAddFieldVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Нове поле</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>
          Назва поля<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>
        </div>
        <div style={inputWrap}>
          <Input placeholder="Назва поля" value={newFieldName} onChange={setNewFieldName} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button block onClick={async () => {
            if (!newFieldName.trim()) return
            try {
              const field = await peopleApi.addCustomField(personId, newFieldName.trim())
              setPerson((p) => p ? { ...p, customFields: [...(p.customFields ?? []), field] } : p)
              setAddFieldVisible(false)
            } catch {
              Toast.show({ content: 'Помилка додавання поля', icon: 'fail' })
            }
          }}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Додати
          </Button>
          <Button block fill="outline" onClick={() => setAddFieldVisible(false)}>Скасувати</Button>
        </div>
      </Popup>
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
    try { await onSave(draft) } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, flex: 1 }}>{field.name}</span>
        <button onClick={onDelete} style={{ ...iconBtn, color: 'var(--color-error)' }}><DeleteOutline /></button>
      </div>
      {editing ? (
        <div>
          <div style={inputWrap}><Input value={draft} onChange={setDraft} placeholder="Значення" /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="mini" loading={saving} onClick={save}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Зберегти
            </Button>
            <Button size="mini" fill="outline" onClick={() => setEditing(false)}>Скасувати</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 15, color: field.value ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>{field.value || '—'}</span>
          <button onClick={() => { setDraft(field.value ?? ''); setEditing(true) }} style={iconBtn}><EditSOutline /></button>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '12px 16px', marginTop: 16, boxShadow: 'var(--shadow-sm)',
}
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 4,
  cursor: 'pointer', color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center', fontSize: 16,
}
const nativeSelect: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', fontSize: 15, color: 'var(--color-text)',
}
const blockLabel: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const fieldLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 2,
}
