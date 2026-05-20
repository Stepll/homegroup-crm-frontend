import { useState, useEffect } from 'react'
import { NavBar, SearchBar, Button, Empty, SpinLoading, Popup, Checkbox } from 'antd-mobile'
import { usePeoplePage, TAG_LABELS } from './usePeoplePage'
import type { TagItem, DotEntry } from './usePeoplePage'
import type { GroupMember } from '@/types'

export function PeoplePageMobile() {
  const {
    people,
    groups,
    loading,
    search,
    setSearch,
    showAdmins,
    setShowAdmins,
    myOversight,
    setMyOversight,
    selectedGroupIds,
    toggleGroupId,
    toggleAllGroups,
    allSelected,
    showGroupFilter,
    tagSettings,
    updateTagSettings,
    attDots,
    handleItemClick,
    canCreate,
    navigate,
  } = usePeoplePage()

  const [groupsDrawerVisible, setGroupsDrawerVisible] = useState(false)
  const [tagSettingsVisible, setTagSettingsVisible] = useState(false)

  return (
    <div>
      <NavBar
        back={null}
        right={
          canCreate ? (
            <Button size="small" color="primary" onClick={() => navigate('/people/new')}>
              + Додати
            </Button>
          ) : null
        }
      >
        Люди
      </NavBar>

      <div style={{ padding: '8px 16px 4px' }}>
        <SearchBar placeholder="Пошук..." value={search} onChange={setSearch} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <FilterPill
          label="Показати адмінів"
          active={showAdmins && !myOversight}
          onToggle={() => { setShowAdmins((v) => !v); setMyOversight(false) }}
        />
        <FilterPill
          label="Під моєю опікою"
          active={myOversight}
          onToggle={() => { setMyOversight((v) => !v); if (!myOversight) setShowAdmins(false) }}
        />
        {showGroupFilter && (
          <FilterPill
            label={allSelected ? 'Домашки' : `Домашки (${selectedGroupIds.size})`}
            active={!allSelected}
            onToggle={() => setGroupsDrawerVisible(true)}
            arrow
          />
        )}
        <FilterPill
          label="Теги"
          active={false}
          onToggle={() => setTagSettingsVisible(true)}
          icon="⚙️"
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading />
        </div>
      ) : people.length === 0 ? (
        <Empty description="Людей не знайдено" style={{ marginTop: 48 }} />
      ) : (
        <div style={{ background: '#fff', borderTop: '1px solid var(--color-border-light)', borderBottom: '1px solid var(--color-border-light)' }}>
          {people.map((m) => {
            const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
            const hasArrow = m.isAdmin ? !!m.userId : true
            return (
              <PersonRow
                key={key}
                m={m}
                tagSettings={tagSettings}
                attDots={attDots[key]}
                hasArrow={hasArrow}
                onClick={() => handleItemClick(m)}
              />
            )
          })}
        </div>
      )}

      <Popup
        visible={groupsDrawerVisible}
        onMaskClick={() => setGroupsDrawerVisible(false)}
        position="bottom"
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: 16, maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Домашки</div>
        <button
          onClick={toggleAllGroups}
          style={{ marginBottom: 12, background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}
        >
          {allSelected ? 'Зняти всі' : 'Вибрати всі'}
        </button>
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => toggleGroupId(g.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 9999, background: g.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 15 }}>{g.name}</span>
            <Checkbox checked={selectedGroupIds.has(g.id)} onChange={() => {}} />
          </div>
        ))}
        <Button block color="primary" style={{ marginTop: 16 }} onClick={() => setGroupsDrawerVisible(false)}>
          Готово
        </Button>
      </Popup>

      <TagSettingsPopup
        visible={tagSettingsVisible}
        onClose={() => setTagSettingsVisible(false)}
        settings={tagSettings}
        onChange={updateTagSettings}
      />
    </div>
  )
}

// ── PersonRow ────────────────────────────────────────────────────────────────

type TagData = { key: string; label: string; color: string } | { key: 'attendance'; dots: true }

function getPersonTags(m: GroupMember, settings: TagItem[]): TagData[] {
  return settings
    .filter((s) => s.enabled)
    .map((s): TagData | null => {
      switch (s.key) {
        case 'role': return m.roleTag ? { key: 'role', label: m.roleTag.name, color: m.roleTag.color } : null
        case 'group': return m.primaryGroupName ? { key: 'group', label: m.primaryGroupName, color: m.primaryGroupColor ?? 'var(--color-primary)' } : null
        case 'status': return m.status ? { key: 'status', label: m.status.name, color: m.status.color } : null
        case 'oversight': return m.oversightUserName ? { key: 'oversight', label: m.oversightUserName, color: '#6B7280' } : null
        case 'attendance': return { key: 'attendance', dots: true }
        default: return null
      }
    })
    .filter((t): t is TagData => t !== null)
}

const DOT_COLORS: Record<'green' | 'red' | 'yellow', string> = { green: '#22C55E', red: '#EF4444', yellow: '#F59E0B' }
const DOT_LABELS: Record<'green' | 'red' | 'yellow', string> = { green: 'Присутній', red: 'Відсутній', yellow: 'Скасовано' }

function formatDotDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

function AttendanceDotsTag({ dots }: { dots?: DotEntry[] }) {
  const [open, setOpen] = useState(false)
  const hasData = dots && dots.length > 0
  const shown = hasData ? dots.slice(0, 5) : []
  return (
    <>
      <div
        onClick={(e) => { e.stopPropagation(); if (hasData) setOpen(true) }}
        style={{ ...tagStyle, display: 'flex', gap: 4, alignItems: 'center', padding: '4px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border-light)', flexShrink: 0, cursor: hasData ? 'pointer' : 'default' }}
      >
        {hasData
          ? shown.map((d, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: DOT_COLORS[d.color], flexShrink: 0 }} />
            ))
          : <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
        }
      </div>
      <Popup visible={open} onMaskClick={() => setOpen(false)} bodyStyle={{ borderRadius: '12px 12px 0 0', padding: '16px 20px 28px' }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Відвідуваність</div>
        {shown.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: DOT_COLORS[d.color], flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', minWidth: 44 }}>{formatDotDate(d.date)}</span>
            <span style={{ fontSize: 14, color: d.color === 'green' ? '#22C55E' : d.color === 'yellow' ? '#F59E0B' : '#EF4444' }}>{DOT_LABELS[d.color]}</span>
          </div>
        ))}
      </Popup>
    </>
  )
}

function PersonRow({ m, tagSettings, attDots, hasArrow, onClick }: {
  m: GroupMember
  tagSettings: TagItem[]
  attDots?: DotEntry[]
  hasArrow: boolean
  onClick: () => void
}) {
  const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
  const tags = getPersonTags(m, tagSettings)

  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
    >
      <div style={{ width: '30%', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{fullName}</span>
      </div>
      <div style={{ width: '60%', flexShrink: 0, display: 'flex', gap: 4, overflow: 'hidden', alignItems: 'center' }}>
        {tags.map((t) =>
          'dots' in t ? (
            <AttendanceDotsTag key="attendance" dots={attDots} />
          ) : (
            <span key={t.key} style={{ ...tagStyle, color: t.color, background: `${t.color}18`, flexShrink: 0 }}>
              {t.label}
            </span>
          )
        )}
      </div>
      <div style={{ width: '10%', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: 'var(--color-text-tertiary)' }}>
        {hasArrow && <span style={{ fontSize: 18, lineHeight: 1 }}>›</span>}
      </div>
    </div>
  )
}

// ── TagSettingsPopup ─────────────────────────────────────────────────────────

function TagSettingsPopup({ visible, onClose, settings, onChange }: {
  visible: boolean
  onClose: () => void
  settings: TagItem[]
  onChange: (s: TagItem[]) => void
}) {
  const [local, setLocal] = useState<TagItem[]>(settings)

  useEffect(() => { if (visible) setLocal(settings) }, [visible, settings])

  const toggle = (idx: number) => setLocal((prev) => prev.map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t))
  const move = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= local.length) return
    setLocal((prev) => { const next = [...prev]; [next[idx], next[newIdx]] = [next[newIdx], next[idx]]; return next })
  }
  const save = () => { onChange(local); onClose() }

  return (
    <Popup visible={visible} onMaskClick={onClose} position="bottom" bodyStyle={{ borderRadius: '16px 16px 0 0', padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Налаштування тегів</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
        Оберіть яка інформація відображається та порядок
      </div>
      {local.map((item, idx) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => toggle(idx)}>
            <Checkbox checked={item.enabled} onChange={() => toggle(idx)} />
            <span style={{ fontSize: 15 }}>{TAG_LABELS[item.key]}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => move(idx, -1)} disabled={idx === 0} style={reorderBtn(idx === 0)}>▲</button>
            <button onClick={() => move(idx, 1)} disabled={idx === local.length - 1} style={reorderBtn(idx === local.length - 1)}>▼</button>
          </div>
        </div>
      ))}
      <Button block color="primary" style={{ marginTop: 16 }} onClick={save}>Готово</Button>
    </Popup>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FilterPill({ label, active, onToggle, arrow = false, icon }: {
  label: string; active: boolean; onToggle: () => void; arrow?: boolean; icon?: string
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '5px 11px', borderRadius: 9999, border: '1.5px solid', flexShrink: 0,
        borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
        background: active ? 'var(--color-primary-bg)' : 'transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
      {label}
      {arrow && <span style={{ fontSize: 10 }}>▾</span>}
    </button>
  )
}

const reorderBtn = (disabled: boolean): React.CSSProperties => ({
  width: 28, height: 28, border: '1px solid var(--color-border)',
  borderRadius: 6, background: disabled ? 'var(--color-bg)' : '#fff',
  color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
  cursor: disabled ? 'default' : 'pointer', fontSize: 11,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

const tagStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, borderRadius: 6,
  padding: '2px 7px', whiteSpace: 'nowrap',
}
