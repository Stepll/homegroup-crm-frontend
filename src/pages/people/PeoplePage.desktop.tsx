import { useState, useEffect, useMemo } from 'react'
import { Table, Input, Button, Tag, Space, Tooltip, Flex } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { FilterValue, SorterResult, TablePaginationConfig } from 'antd/es/table/interface'
import type { SortOrder } from 'antd/es/table/interface'
import { usePeoplePage } from './usePeoplePage'
import type { DotEntry } from './usePeoplePage'
import type { GroupMember } from '@/types'

const DOT_COLORS: Record<'green' | 'red' | 'yellow', string> = {
  green: '#22C55E',
  red: '#EF4444',
  yellow: '#F59E0B',
}

// ── Table state persistence ───────────────────────────────────────────────────

interface TableState {
  sortField: string | null
  sortOrder: SortOrder | null
  filters: Record<string, FilterValue | null>
}

function loadTableState(): TableState {
  try {
    const s = localStorage.getItem('people-table-state')
    if (s) return JSON.parse(s)
  } catch {}
  return { sortField: null, sortOrder: null, filters: {} }
}

// ─────────────────────────────────────────────────────────────────────────────

export function PeoplePageDesktop() {
  const {
    allPeople,
    groups,
    loading,
    search,
    setSearch,
    showAdmins,
    setShowAdmins,
    myOversight,
    setMyOversight,
    tagSettings,
    attDots,
    handleItemClick,
    canCreate,
    navigate,
  } = usePeoplePage()

  const [tableState, setTableState] = useState<TableState>(loadTableState)
  const [displayedCount, setDisplayedCount] = useState(0)

  useEffect(() => {
    setDisplayedCount(allPeople.length)
  }, [allPeople])

  useEffect(() => {
    localStorage.setItem('people-table-state', JSON.stringify(tableState))
  }, [tableState])

  const attEnabled = tagSettings.some((t) => t.key === 'attendance' && t.enabled)

  const roleFilters = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of allPeople) {
      if (m.roleTag) map.set(m.roleTag.name, m.roleTag.name)
    }
    const result = [...map.keys()].map((name) => ({ text: name, value: name }))
    if (allPeople.some((m) => !m.roleTag)) result.push({ text: '(без ролі)', value: '__none__' })
    return result
  }, [allPeople])

  const statusFilters = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of allPeople) {
      if (m.status) map.set(m.status.name, m.status.name)
    }
    const result = [...map.keys()].map((name) => ({ text: name, value: name }))
    if (allPeople.some((m) => !m.status)) result.push({ text: '(без статусу)', value: '__none__' })
    return result
  }, [allPeople])

  const oversightFilters = useMemo(() => {
    const names = new Set<string>()
    for (const m of allPeople) {
      if (m.oversightUserName) names.add(m.oversightUserName)
    }
    const result = [...names].map((name) => ({ text: name, value: name }))
    if (allPeople.some((m) => !m.oversightUserName))
      result.push({ text: '(без опікуна)', value: '__none__' })
    return result
  }, [allPeople])

  const handleTableChange = (
    _pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<GroupMember> | SorterResult<GroupMember>[],
    extra: { currentDataSource: GroupMember[] },
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter
    setTableState({
      sortField: s.order ? (s.columnKey as string | null) ?? null : null,
      sortOrder: s.order ?? null,
      filters,
    })
    setDisplayedCount(extra.currentDataSource.length)
  }

  const sortOrder = (key: string): SortOrder | undefined =>
    tableState.sortField === key ? (tableState.sortOrder ?? undefined) : undefined

  const columns: ColumnsType<GroupMember> = [
    {
      title: "Ім'я",
      key: 'name',
      width: 200,
      render: (_, m) => {
        const fullName = [m.name, m.lastName].filter(Boolean).join(' ')
        return (
          <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
            {fullName}
            {m.isAdmin && (
              <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>адмін</Tag>
            )}
          </span>
        )
      },
      sorter: (a, b) => {
        const na = [a.name, a.lastName].filter(Boolean).join(' ')
        const nb = [b.name, b.lastName].filter(Boolean).join(' ')
        return na.localeCompare(nb, 'uk')
      },
      sortOrder: sortOrder('name'),
      showSorterTooltip: false,
    },
    {
      title: 'Домашка',
      key: 'group',
      width: 160,
      render: (_, m) =>
        m.primaryGroupName ? (
          <Tag
            style={{
              background: `${m.primaryGroupColor ?? 'var(--color-primary)'}18`,
              color: m.primaryGroupColor ?? 'var(--color-primary)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            {m.primaryGroupName}
          </Tag>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
        ),
      filters: groups.map((g) => ({ text: g.name, value: g.id })),
      filteredValue: tableState.filters.group ?? null,
      onFilter: (value, m) => m.primaryGroupId === (value as number),
      sorter: (a, b) =>
        (a.primaryGroupName ?? '').localeCompare(b.primaryGroupName ?? '', 'uk'),
      sortOrder: sortOrder('group'),
      showSorterTooltip: false,
    },
    {
      title: 'Роль',
      key: 'role',
      width: 140,
      render: (_, m) =>
        m.roleTag ? (
          <Tag
            style={{
              background: `${m.roleTag.color}18`,
              color: m.roleTag.color,
              border: 'none',
              fontWeight: 600,
            }}
          >
            {m.roleTag.name}
          </Tag>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
        ),
      filters: roleFilters,
      filteredValue: tableState.filters.role ?? null,
      onFilter: (value, m) =>
        value === '__none__' ? !m.roleTag : m.roleTag?.name === (value as string),
      sorter: (a, b) => (a.roleTag?.name ?? '').localeCompare(b.roleTag?.name ?? '', 'uk'),
      sortOrder: sortOrder('role'),
      showSorterTooltip: false,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 130,
      render: (_, m) =>
        m.status ? (
          <Tag
            style={{
              background: `${m.status.color}18`,
              color: m.status.color,
              border: 'none',
              fontWeight: 600,
            }}
          >
            {m.status.name}
          </Tag>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
        ),
      filters: statusFilters,
      filteredValue: tableState.filters.status ?? null,
      onFilter: (value, m) =>
        value === '__none__' ? !m.status : m.status?.name === (value as string),
      sorter: (a, b) => (a.status?.name ?? '').localeCompare(b.status?.name ?? '', 'uk'),
      sortOrder: sortOrder('status'),
      showSorterTooltip: false,
    },
    {
      title: 'Опікун',
      key: 'oversight',
      width: 140,
      render: (_, m) =>
        m.oversightUserName ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {m.oversightUserName}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
        ),
      filters: oversightFilters,
      filteredValue: tableState.filters.oversight ?? null,
      onFilter: (value, m) =>
        value === '__none__'
          ? !m.oversightUserName
          : m.oversightUserName === (value as string),
      sorter: (a, b) =>
        (a.oversightUserName ?? '').localeCompare(b.oversightUserName ?? '', 'uk'),
      sortOrder: sortOrder('oversight'),
      showSorterTooltip: false,
    },
    ...(attEnabled
      ? [
          {
            title: 'Відвідуваність',
            key: 'attendance',
            width: 160,
            render: (_: unknown, m: GroupMember) => {
              const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
              const dots: DotEntry[] = attDots[key] ?? []
              if (dots.length === 0)
                return (
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
                )
              return (
                <Flex gap={4} align="center">
                  {dots.slice(0, 5).map((d, i) => {
                    const [, mo, day] = d.date.split('-')
                    const label =
                      d.color === 'green'
                        ? 'Присутній'
                        : d.color === 'yellow'
                          ? 'Скасовано'
                          : 'Відсутній'
                    return (
                      <Tooltip key={i} title={`${day}.${mo} — ${label}`}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: DOT_COLORS[d.color],
                            flexShrink: 0,
                            cursor: 'default',
                          }}
                        />
                      </Tooltip>
                    )
                  })}
                </Flex>
              )
            },
            // Absence filter: how many red dots in last 5 meetings
            filters: [
              { text: '≥1 пропуск', value: 1 },
              { text: '≥2 пропуски', value: 2 },
              { text: '≥3 пропуски', value: 3 },
              { text: '≥4 пропуски', value: 4 },
              { text: '5 пропусків', value: 5 },
            ],
            filteredValue: tableState.filters.attendance ?? null,
            filterMultiple: false,
            onFilter: (value: unknown, m: GroupMember) => {
              const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
              const dots = attDots[key] ?? []
              const absences = dots.filter((d) => d.color === 'red').length
              return absences >= Number(value)
            },
            sorter: (a: GroupMember, b: GroupMember) => {
              const keyA = a.isAdmin ? `u_${a.userId}` : `p_${a.id}`
              const keyB = b.isAdmin ? `u_${b.userId}` : `p_${b.id}`
              const absA = (attDots[keyA] ?? []).filter((d) => d.color === 'red').length
              const absB = (attDots[keyB] ?? []).filter((d) => d.color === 'red').length
              return absA - absB
            },
            sortOrder: sortOrder('attendance'),
            showSorterTooltip: false,
          },
        ]
      : []),
  ]

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>
          Люди
        </h1>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/people/new')}
          >
            Додати
          </Button>
        )}
      </Flex>

      {/* Filters */}
      <Flex gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
          placeholder="Пошук..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />

        <Space>
          <Button
            type={showAdmins && !myOversight ? 'primary' : 'default'}
            ghost={showAdmins && !myOversight}
            onClick={() => {
              setShowAdmins((v) => !v)
              setMyOversight(false)
            }}
            size="middle"
          >
            Адміни
          </Button>
          <Button
            type={myOversight ? 'primary' : 'default'}
            ghost={myOversight}
            onClick={() => {
              setMyOversight((v) => !v)
              if (!myOversight) setShowAdmins(false)
            }}
            size="middle"
          >
            Під моєю опікою
          </Button>
        </Space>

        <span
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            alignSelf: 'center',
          }}
        >
          {displayedCount} осіб
        </span>
      </Flex>

      {/* Table */}
      <Table
        dataSource={allPeople}
        columns={columns}
        rowKey={(m) => (m.isAdmin ? `u_${m.userId}` : `p_${m.id}`)}
        loading={loading}
        pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true }}
        onRow={(m) => ({
          onClick: () => handleItemClick(m),
          style: { cursor: 'pointer' },
        })}
        onChange={handleTableChange}
        size="middle"
        scroll={{ x: 800 }}
        locale={{ emptyText: 'Людей не знайдено' }}
        style={{ background: '#fff', borderRadius: 12 }}
      />
    </div>
  )
}
