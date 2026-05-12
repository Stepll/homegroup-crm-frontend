import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, List, SpinLoading, Toast, Empty, Popup, Input, Button } from 'antd-mobile'
import { EditSOutline, RightOutline, DownOutline, UpOutline } from 'antd-mobile-icons'
import { groupsApi } from '@/api/groups'
import { useAuth } from '@/store/auth'
import type { Group, GroupCabinet } from '@/types'

const ADMIN_ROLES = ['SuperAdmin', 'Admin']

// ── Group selector (for admins) ───────────────────────────────────────────────

function GroupSelector() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupsApi.getAll().then(setGroups).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>

  return (
    <div>
      <NavBar back={null}>Кабінет</NavBar>
      <List style={{ marginTop: 12 }}>
        {groups.map((g) => (
          <List.Item
            key={g.id}
            arrow={<RightOutline />}
            extra={<span style={{ ...tagStyle, color: g.color, background: `${g.color}18` }}>{g.isActive ? 'Активна' : 'Неактивна'}</span>}
            onClick={() => navigate(`/cabinet/${g.id}`)}
          >
            {g.name}
          </List.Item>
        ))}
      </List>
    </div>
  )
}

// ── Cabinet view ──────────────────────────────────────────────────────────────

export function GroupCabinetPage() {
  const { id } = useParams<{ id?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.roles?.some((r) => ADMIN_ROLES.includes(r)) ?? false

  // If no id in URL and user is not admin → use their primary group
  const groupId = id ? Number(id) : (!isAdmin ? user?.primaryGroupId : undefined)

  // Admin without an id in URL → show group selector
  if (!groupId && isAdmin) return <GroupSelector />

  if (!groupId) return (
    <div>
      <NavBar back={null}>Кабінет</NavBar>
      <Empty description="Вас не призначено до жодної групи" style={{ marginTop: 60 }} />
    </div>
  )

  return <CabinetView groupId={groupId} isAdmin={isAdmin} />
}

// ── Cabinet content ───────────────────────────────────────────────────────────

function CabinetView({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const navigate = useNavigate()
  const [cabinet, setCabinet] = useState<GroupCabinet | null>(null)
  const [loading, setLoading] = useState(true)
  const [editVisible, setEditVisible] = useState(false)

  const load = () =>
    groupsApi.getCabinet(groupId)
      .then(setCabinet)
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [groupId])

  if (loading || !cabinet) return (
    <div>
      <NavBar back={isAdmin ? () => navigate('/cabinet') : null}>Кабінет</NavBar>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
    </div>
  )

  const { group, nextMeetingDate, lastMeetingDate, lastAttendance, upcomingEvents, orgTeam, stats } = cabinet

  const attendancePct = lastAttendance
    ? Math.round(lastAttendance.present * 100 / (lastAttendance.total || 1))
    : null

  const formatDate = (iso?: string) => {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <NavBar back={isAdmin ? () => navigate('/cabinet') : null}>Кабінет</NavBar>

      <div style={{ padding: '0 16px' }}>

        {/* Block 1: Group info */}
        <div style={block}>
          <div style={{ padding: '14px 0 10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</span>
                </div>
                {(group.meetingDay || group.meetingTime) && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                    {[group.meetingDay, group.meetingTime].filter(Boolean).join(' · ')}
                  </div>
                )}
                {group.location && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{group.location}</div>
                )}
              </div>
              <button onClick={() => setEditVisible(true)} style={iconBtn}><EditSOutline style={{ fontSize: 18 }} /></button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <Stat label="Учасників" value={stats.totalMembers} />
              <Stat label="Ср. відвідуваність" value={`${stats.avgAttendanceRate}%`} />
              <Stat label="Нових цього місяця" value={stats.newMembersThisMonth} />
            </div>
          </div>
        </div>

        {/* Block 2: Next meeting */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <SectionLabel>Наступна домашка</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, color: 'var(--color-text)', fontWeight: 500 }}>
                {formatDate(nextMeetingDate) ?? 'Невідомо'}
              </span>
              <Button size="small" fill="outline"
                style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                disabled>
                Планування
              </Button>
            </div>
          </div>
        </div>

        {/* Block 3: Attendance */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <SectionLabel>Присутність</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {lastMeetingDate
                  ? <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Остання: {formatDate(lastMeetingDate)}</span>
                  : <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Немає зустрічей</span>}
                {lastAttendance && (
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                    {lastAttendance.present}/{lastAttendance.total}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
                      {attendancePct}%
                    </span>
                  </div>
                )}
              </div>
              {lastMeetingDate && (
                <Button size="small" fill="solid"
                  style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}
                  onClick={() => navigate(`/groups/${groupId}/attendance`)}>
                  Відмітити
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Block 4: Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div style={{ ...block, padding: '14px 16px' }}>
            <SectionLabel>Найближчі події</SectionLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map((ev) => (
                <div key={ev.personId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>🎂 {ev.fullName}</span>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {formatBirthday(ev.dateOfBirth)}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: ev.daysUntil === 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', fontWeight: 600 }}>
                    {ev.daysUntil === 0 ? 'Сьогодні!' : `за ${ev.daysUntil} дн.`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block 5: Org team */}
        <div style={{ ...block, padding: '14px 16px' }}>
          <SectionLabel>Орг команда</SectionLabel>
          {orgTeam.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8, display: 'block' }}>Немає призначених адмінів</span>
            : orgTeam.map((member) => <OrgMemberRow key={member.id} member={member} />)
          }
        </div>

        {/* Block 6: Stats */}
        <div style={block}>
          <div style={{ padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionLabel>Статистика</SectionLabel>
              <Button size="mini" fill="none"
                style={{ '--text-color': 'var(--color-primary)' } as React.CSSProperties}
                disabled>
                Деталі →
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <StatCard label="Ср. відвідуваність" value={`${stats.avgAttendanceRate}%`} />
              <StatCard label="Нових цього місяця" value={`${stats.newMembersThisMonth}`} />
              <StatCard label="Всього учасників" value={`${stats.totalMembers}`} />
            </div>
          </div>
        </div>

      </div>

      {/* Edit group info popup */}
      <EditGroupPopup
        group={group}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={() => { setEditVisible(false); load() }}
      />
    </div>
  )
}

// ── Org member row with collapse ──────────────────────────────────────────────

function OrgMemberRow({ member }: { member: GroupCabinet['orgTeam'][0] }) {
  const [open, setOpen] = useState(false)
  const fullName = [member.name, member.lastName].filter(Boolean).join(' ')

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{fullName}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
              {member.overseeCount} під опікою
            </span>
          </div>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {open ? <UpOutline /> : <DownOutline />}
          </span>
        </div>
      </button>
      {open && member.oversees.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: '2px solid var(--color-border-light)' }}>
          {member.oversees.map((p) => (
            <div key={p.id} style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '3px 0' }}>
              {p.fullName}
            </div>
          ))}
        </div>
      )}
      {open && member.oversees.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', paddingLeft: 12, marginTop: 4 }}>
          Немає людей під опікою
        </div>
      )}
    </div>
  )
}

// ── Edit group popup ──────────────────────────────────────────────────────────

const MEETING_DAYS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

function EditGroupPopup({ group, visible, onClose, onSaved }: {
  group: GroupCabinet['group']
  visible: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(group.name)
  const [meetingDay, setMeetingDay] = useState(group.meetingDay ?? '')
  const [meetingTime, setMeetingTime] = useState(group.meetingTime ?? '')
  const [location, setLocation] = useState(group.location ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setName(group.name)
      setMeetingDay(group.meetingDay ?? '')
      setMeetingTime(group.meetingTime ?? '')
      setLocation(group.location ?? '')
    }
  }, [visible, group])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const current = await groupsApi.getById(group.id)
      await groupsApi.update(group.id, {
        ...current,
        name: name.trim(),
        meetingDay: meetingDay || undefined,
        meetingTime: meetingTime || undefined,
        location: location.trim() || undefined,
      })
      onSaved()
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    }
    setSaving(false)
  }

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Редагувати групу</div>

      <FormField label="Назва групи">
        <Input value={name} onChange={setName} placeholder="Назва" />
      </FormField>
      <FormField label="День домашки">
        <select value={meetingDay} onChange={(e) => setMeetingDay(e.target.value)} style={nativeSelect}>
          <option value="">— не вибрано —</option>
          {MEETING_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </FormField>
      <FormField label="Час">
        <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)}
          style={{ ...nativeSelect, padding: 0 }} />
      </FormField>
      <FormField label="Адреса">
        <Input value={location} onChange={setLocation} placeholder="Адреса зустрічі" />
      </FormField>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button block loading={saving} onClick={handleSave}
          style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
          Зберегти
        </Button>
        <Button block fill="outline" onClick={onClose}>Скасувати</Button>
      </div>
    </Popup>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={inputWrap}>{children}</div>
    </div>
  )
}

function formatBirthday(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '0 16px', marginTop: 16,
  boxShadow: 'var(--shadow-sm)',
}
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 4,
  cursor: 'pointer', color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center',
}
const nativeSelect: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', fontSize: 15, color: 'var(--color-text)',
}
const tagStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  borderRadius: 6, padding: '2px 7px',
}
