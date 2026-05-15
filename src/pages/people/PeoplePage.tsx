import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, List, SearchBar, Button, Empty, SpinLoading, Popup, Checkbox } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import { groupsApi } from '@/api/groups'
import { usePermission } from '@/hooks/usePermission'
import type { Group, GroupMember } from '@/types'

export function PeoplePage() {
  const navigate = useNavigate()
  const canCreate = usePermission('people.create')
  const [people, setPeople] = useState<GroupMember[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdmins, setShowAdmins] = useState(true)
  const [myOversight, setMyOversight] = useState(false)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set())
  const [groupsDrawerVisible, setGroupsDrawerVisible] = useState(false)

  useEffect(() => {
    groupsApi.getAll().then((gs) => {
      setGroups(gs)
      setSelectedGroupIds(new Set(gs.map((g) => g.id)))
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    peopleApi.getAll(search || undefined, undefined, showAdmins && !myOversight, myOversight || undefined)
      .then(setPeople)
      .finally(() => setLoading(false))
  }, [search, showAdmins, myOversight])

  const handleItemClick = (m: GroupMember) => {
    if (m.isAdmin) navigate(`/admins/${m.userId}`)
    else navigate(`/people/${m.id}`)
  }

  const allSelected = selectedGroupIds.size === groups.length
  const filtered = allSelected
    ? people
    : people.filter((m) => m.primaryGroupId != null && selectedGroupIds.has(m.primaryGroupId))

  const showGroupFilter = groups.length > 1

  return (
    <div>
      <NavBar back={null} right={canCreate ? <Button size="small" color="primary" onClick={() => navigate('/people/new')}>+ Додати</Button> : null}>
        Люди
      </NavBar>

      <div style={{ padding: '8px 16px 4px' }}>
        <SearchBar placeholder="Пошук..." value={search} onChange={setSearch} />
      </div>

      {/* Filter pills */}
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
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <SpinLoading />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description="Людей не знайдено" style={{ marginTop: 48 }} />
      ) : (
        <List>
          {filtered.map((m) => {
            const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
            const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
            return (
              <List.Item
                key={key}
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.isAdmin && m.roleTag && (
                      <span style={{ ...tag, color: m.roleTag.color, background: `${m.roleTag.color}18` }}>
                        {m.roleTag.name}
                      </span>
                    )}
                    {m.primaryGroupName && (
                      <span style={{ ...tag, color: m.primaryGroupColor ?? 'var(--color-primary)', background: `${m.primaryGroupColor ?? 'var(--color-primary)'}18` }}>
                        {m.primaryGroupName}
                      </span>
                    )}
                  </div>
                }
                onClick={() => handleItemClick(m)}
                arrow
              >
                {fullName}
              </List.Item>
            )
          })}
        </List>
      )}

      {/* Groups filter drawer */}
      <Popup
        visible={groupsDrawerVisible}
        onMaskClick={() => setGroupsDrawerVisible(false)}
        position="bottom"
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: 16, maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Домашки</div>
        <button
          onClick={() => setSelectedGroupIds(allSelected ? new Set() : new Set(groups.map((g) => g.id)))}
          style={{ marginBottom: 12, background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}
        >
          {allSelected ? 'Зняти всі' : 'Вибрати всі'}
        </button>
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => setSelectedGroupIds((prev) => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}
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
    </div>
  )
}

function FilterPill({ label, active, onToggle, arrow = false }: {
  label: string; active: boolean; onToggle: () => void; arrow?: boolean
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
      {label}{arrow && <span style={{ fontSize: 10 }}>▾</span>}
    </button>
  )
}

const tag: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, borderRadius: 6,
  padding: '2px 7px', whiteSpace: 'nowrap',
}
