import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, Input, Button, Toast, SpinLoading, Dialog, Popup, Switch } from 'antd-mobile'
import { CloseOutline, EditSOutline } from 'antd-mobile-icons'
import { adminsApi } from '@/api/admins'
import { attendanceApi } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { rolesApi } from '@/api/roles'
import { personStatusesApi, type PersonStatus } from '@/api/personStatuses'
import { AttendanceGrid } from '@/components/AttendanceGrid'
import { AdminTasksBlock } from '@/components/AdminTasksBlock'
import type { Admin, Group, AttendanceRecord } from '@/types'
import type { Role } from '@/api/roles'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    <Popup visible={visible} onMaskClick={onClose}
      bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '20px 16px 36px', maxHeight: '85vh', overflowY: 'auto' }}>
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

// ── EditableField (inline) ────────────────────────────────────────────────────

function EditableField({ label, display, onSave, renderEditor }: {
  label: string
  display: string
  onSave: (val: string) => Promise<void>
  renderEditor: (val: string, onChange: (v: string) => void) => React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(display)
  const [saving, setSaving] = useState(false)

  const start = () => { setDraft(display); setEditing(true) }
  const cancel = () => setEditing(false)
  const save = async () => {
    setSaving(true)
    try { await onSave(draft) } catch { Toast.show({ content: 'Помилка збереження', icon: 'fail' }) }
    setSaving(false); setEditing(false)
  }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      {editing ? (
        <div>
          <div style={inputWrap}>{renderEditor(draft, setDraft)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="mini" loading={saving} onClick={save}
              style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
              Зберегти
            </Button>
            <Button size="mini" fill="outline" onClick={cancel}>Скасувати</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 15, color: display ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
            {display || '—'}
          </span>
          <button onClick={start} style={iconBtn}><EditSOutline /></button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminDetailPageMobile() {
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

  const [pwdVisible, setPwdVisible] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  // Profile popup state
  const [personalOpen, setPersonalOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [churchOpen, setChurchOpen] = useState(false)
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

  const load = () =>
    Promise.all([adminsApi.getById(adminId), groupsApi.getAll(), rolesApi.getAll(), personStatusesApi.getAll()])
      .then(([a, g, r, s]) => { setAdmin(a); setGroups(g); setRoles(r); setStatuses(s) })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [adminId])

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
        <NavBar onBack={() => navigate(-1)}>Адмін</NavBar>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
      </div>
    )
  }

  const save = async (patch: Partial<Parameters<typeof adminsApi.update>[1]>) => {
    const updated = await adminsApi.update(adminId, {
      name: admin.name,
      lastName: admin.lastName,
      email: admin.email,
      roleIds: admin.roles.map((r) => r.id),
      primaryGroupId: admin.primaryGroupId,
      visibleGroupIds: admin.visibleGroups.map((g) => g.id),
      ...patch,
    })
    setAdmin(updated)
  }

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

  const saveProfile = async (patch: object) => {
    setProfileSaving(true)
    try {
      const updated = await adminsApi.updateProfile(adminId, { ...baseProfile(), ...patch })
      setAdmin(updated)
      return true
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
      return false
    } finally {
      setProfileSaving(false)
    }
  }

  const fullName = [admin.name, admin.lastName].filter(Boolean).join(' ')

  const handleDelete = async () => {
    const confirmed = await Dialog.confirm({
      title: 'Видалити адміна?',
      content: `"${fullName}" буде видалено назавжди.`,
      confirmText: 'Видалити', cancelText: 'Скасувати',
    })
    if (!confirmed) return
    try {
      await adminsApi.remove(adminId)
      Toast.show({ content: 'Видалено', icon: 'success' })
      navigate('/settings/admins', { replace: true })
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  const handleSetPassword = async () => {
    if (!newPwd.trim()) return
    setPwdSaving(true)
    try {
      await adminsApi.setPassword(adminId, newPwd)
      Toast.show({ content: 'Пароль змінено', icon: 'success' })
      setPwdVisible(false); setNewPwd('')
    } catch {
      Toast.show({ content: 'Помилка зміни пароля', icon: 'fail' })
    }
    setPwdSaving(false)
  }

  const toggleRole = async (role: Role) => {
    const hasRole = admin.roles.some((r) => r.id === role.id)
    const newRoleIds = hasRole
      ? admin.roles.filter((r) => r.id !== role.id).map((r) => r.id)
      : [...admin.roles.map((r) => r.id), role.id]
    await save({ roleIds: newRoleIds })
  }

  const toggleVisibleGroup = async (group: Group) => {
    const has = admin.visibleGroups.some((g) => g.id === group.id)
    const newIds = has
      ? admin.visibleGroups.filter((g) => g.id !== group.id).map((g) => g.id)
      : [...admin.visibleGroups.map((g) => g.id), group.id]
    await save({ visibleGroupIds: newIds })
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar onBack={() => navigate(-1)}>{fullName || 'Адмін'}</NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* Block 1: Preview — name, lastname, communication buttons */}
        <div style={block}>
          <EditableField
            label="Ім'я"
            display={admin.name}
            onSave={(v) => save({ name: v || admin.name })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="Ім'я" />}
          />
          <EditableField
            label="Прізвище"
            display={admin.lastName ?? ''}
            onSave={(v) => save({ lastName: v || undefined })}
            renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="Прізвище" />}
          />
          <div style={{ padding: '12px 0', display: 'flex', gap: 10 }}>
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

        <AdminTasksBlock adminId={adminId} />

        {/* Block 2: Personal info */}
        <BlockCard title="Особиста інформація" onEdit={() => {
          setDraftDob(admin.dateOfBirth ?? ''); setDraftGender(admin.gender ?? '')
          setDraftMarital(admin.maritalStatus ?? ''); setDraftAddress(admin.address ?? '')
          setDraftNotes(admin.notes ?? ''); setPersonalOpen(true)
        }}>
          <InfoRow label="Дата народження">{admin.dateOfBirth ?? '—'}</InfoRow>
          <InfoRow label="Стать">{genderLabel(admin.gender)}</InfoRow>
          <InfoRow label="Сімейний стан">{maritalLabel(admin.maritalStatus)}</InfoRow>
          <InfoRow label="Адреса">{admin.address ?? '—'}</InfoRow>
          {admin.notes && <InfoRow label="Нотатки">{admin.notes}</InfoRow>}
        </BlockCard>

        {/* Block 3: Contact */}
        <BlockCard title="Комунікація" onEdit={() => {
          setDraftPhone(admin.phone ?? ''); setDraftTelegram(admin.telegram ?? '')
          setContactOpen(true)
        }}>
          <InfoRow label="Телефон">{admin.phone ?? '—'}</InfoRow>
          <InfoRow label="Email">{admin.email}</InfoRow>
          <InfoRow label="Telegram">{admin.telegram ?? '—'}</InfoRow>
        </BlockCard>

        {/* Block 4: Church */}
        <BlockCard title="Церква" onEdit={() => {
          setDraftIsBaptized(admin.isBaptized); setDraftChurch(admin.church ?? '')
          setDraftMinistry(admin.ministry ?? ''); setDraftIsBaptizedWithSpirit(admin.isBaptizedWithSpirit)
          setDraftStatusId(admin.status?.id); setChurchOpen(true)
        }}>
          <InfoRow label="Статус">{admin.status?.name ?? '—'}</InfoRow>
          <InfoRow label="Хрещення">{admin.isBaptized ? 'Охрещений(а)' : 'Не охрещений(а)'}</InfoRow>
          <InfoRow label="Церква">{admin.church ?? '—'}</InfoRow>
          <InfoRow label="Служіння">{admin.ministry ?? '—'}</InfoRow>
          <InfoRow label="Хрещення Духом">{admin.isBaptizedWithSpirit ? 'Так' : 'Ні'}</InfoRow>
        </BlockCard>

        {/* Block 5: Attendance */}
        <AttendanceGrid
          userId={adminId}
          group={groups.find((g) => g.id === admin.primaryGroupId)}
          attendance={attendance}
          loading={attendanceLoading}
          noGroupMessage="Адмін не прив'язаний до групи"
        />

        {/* Block 5: Security */}
        <div style={block}>
          <div style={{ padding: '12px 0' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 500 }}>Безпека</div>
            <EditableField
              label="Email"
              display={admin.email}
              onSave={(v) => save({ email: v || admin.email })}
              renderEditor={(v, onChange) => <Input value={v} onChange={onChange} placeholder="email@example.com" type="email" />}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button size="small" fill="outline"
                style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                onClick={() => { setNewPwd(''); setPwdVisible(true) }}>
                Змінити пароль
              </Button>
            </div>
          </div>
        </div>

        {/* Block 6: Roles */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, fontWeight: 500 }}>Ролі</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {admin.roles.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Без ролі</span>
            )}
            {admin.roles.map((role) => (
              <span key={role.id} style={{ ...roleTag, color: role.color, background: `${role.color}18`, display: 'flex', alignItems: 'center', gap: 4 }}>
                {role.name}
                <button onClick={() => toggleRole(roles.find((r) => r.id === role.id)!)} style={removeBtn}>
                  <CloseOutline style={{ fontSize: 10 }} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {roles.filter((r) => !admin.roles.some((ar) => ar.id === r.id)).map((role) => (
              <button key={role.id} onClick={() => toggleRole(role)}
                style={{ ...roleTag, color: role.color, background: 'transparent', border: `1.5px dashed ${role.color}` }}>
                + {role.name}
              </button>
            ))}
          </div>
        </div>

        {/* Block 8: Visible groups */}
        <div style={{ ...block, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10, fontWeight: 500 }}>Видимі домашки</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {admin.visibleGroups.length === 0 && (
              <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Не вибрано</span>
            )}
            {admin.visibleGroups.map((g) => (
              <span key={g.id} style={{ ...roleTag, color: g.color, background: `${g.color}18`, display: 'flex', alignItems: 'center', gap: 4 }}>
                {g.name}
                <button onClick={() => toggleVisibleGroup(groups.find((gr) => gr.id === g.id)!)} style={removeBtn}>
                  <CloseOutline style={{ fontSize: 10 }} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {groups.filter((g) => !admin.visibleGroups.some((vg) => vg.id === g.id)).map((g) => (
              <button key={g.id} onClick={() => toggleVisibleGroup(g)}
                style={{ ...roleTag, color: g.color, background: 'transparent', border: `1.5px dashed ${g.color}` }}>
                + {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Delete */}
        {admin.id !== 0 && (
          <Button block onClick={handleDelete} style={{
            '--background-color': 'transparent', '--border-color': 'var(--color-error)',
            '--text-color': 'var(--color-error)', '--border-radius': 'var(--radius-md)',
            height: 48, fontSize: 'var(--font-base)', fontWeight: 600, marginTop: 8,
          } as React.CSSProperties}>
            Видалити адміна
          </Button>
        )}
      </div>

      {/* ── Popup: Особиста ── */}
      <PopupForm visible={personalOpen} title="Особиста інформація" onClose={() => setPersonalOpen(false)}
        onSave={async () => { const ok = await saveProfile({ dateOfBirth: draftDob || undefined, gender: draftGender || undefined, maritalStatus: draftMarital || undefined, address: draftAddress.trim() || undefined, notes: draftNotes.trim() || undefined }); if (ok) setPersonalOpen(false) }}
        saving={profileSaving}>
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
      <PopupForm visible={contactOpen} title="Комунікація" onClose={() => setContactOpen(false)}
        onSave={async () => { const ok = await saveProfile({ phone: draftPhone.trim() || undefined, telegram: draftTelegram.trim() || undefined }); if (ok) setContactOpen(false) }}
        saving={profileSaving}>
        <FormField label="Телефон">
          <Input value={draftPhone} onChange={setDraftPhone} placeholder="+380..." type="tel" />
        </FormField>
        <FormField label="Telegram">
          <Input value={draftTelegram} onChange={setDraftTelegram} placeholder="@username" />
        </FormField>
      </PopupForm>

      {/* ── Popup: Церква ── */}
      <PopupForm visible={churchOpen} title="Церква" onClose={() => setChurchOpen(false)}
        onSave={async () => { const ok = await saveProfile({ isBaptized: draftIsBaptized, church: draftChurch.trim() || undefined, ministry: draftMinistry.trim() || undefined, isBaptizedWithSpirit: draftIsBaptizedWithSpirit, personStatusId: draftStatusId }); if (ok) setChurchOpen(false) }}
        saving={profileSaving}>
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
      <Popup visible={pwdVisible} onMaskClick={() => setPwdVisible(false)} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Новий пароль</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>
          Новий пароль<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>
        </div>
        <div style={inputWrap}>
          <Input placeholder="Введіть новий пароль" type="password" value={newPwd} onChange={setNewPwd} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button block loading={pwdSaving} onClick={handleSetPassword}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Зберегти
          </Button>
          <Button block fill="outline" onClick={() => setPwdVisible(false)}>Скасувати</Button>
        </div>
      </Popup>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '0 16px', marginTop: 16,
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
const roleTag: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '4px 8px',
  cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
}
const removeBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.7,
}
