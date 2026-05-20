import { useState } from 'react'
import { Table, Input, Button, Tag, Space, Select, Tooltip, Flex } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePeoplePage } from './usePeoplePage'
import type { DotEntry } from './usePeoplePage'
import type { GroupMember } from '@/types'

const DOT_COLORS: Record<'green' | 'red' | 'yellow', string> = {
  green: '#22C55E',
  red: '#EF4444',
  yellow: '#F59E0B',
}

export function PeoplePageDesktop() {
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
    showGroupFilter,
    tagSettings,
    attDots,
    handleItemClick,
    canCreate,
    navigate,
  } = usePeoplePage()

  const [groupFilter, setGroupFilter] = useState<number[]>([])

  const attEnabled = tagSettings.some((t) => t.key === 'attendance' && t.enabled)

  const filtered = groupFilter.length === 0
    ? people
    : people.filter((m) => m.primaryGroupId != null && groupFilter.includes(m.primaryGroupId))

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
      onFilter: (value, m) => m.primaryGroupId === value,
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
    },
    {
      title: 'Опікун',
      key: 'oversight',
      width: 140,
      render: (_, m) =>
        m.oversightUserName ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{m.oversightUserName}</span>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
        ),
    },
    ...(attEnabled
      ? [
          {
            title: 'Відвідуваність',
            key: 'attendance',
            width: 130,
            render: (_: unknown, m: GroupMember) => {
              const key = m.isAdmin ? `u_${m.userId}` : `p_${m.id}`
              const dots: DotEntry[] = attDots[key] ?? []
              if (dots.length === 0) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>—</span>
              return (
                <Flex gap={4} align="center">
                  {dots.slice(0, 5).map((d, i) => {
                    const [, mo, day] = d.date.split('-')
                    const label = d.color === 'green' ? 'Присутній' : d.color === 'yellow' ? 'Скасовано' : 'Відсутній'
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
          },
        ]
      : []),
  ]

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>Люди</h1>
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

        {showGroupFilter && (
          <Select
            mode="multiple"
            placeholder="Домашки"
            allowClear
            style={{ minWidth: 180 }}
            value={groupFilter}
            onChange={setGroupFilter}
            maxTagCount={2}
            options={groups.map((g) => ({
              value: g.id,
              label: (
                <span>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: g.color, marginRight: 6 }} />
                  {g.name}
                </span>
              ),
            }))}
          />
        )}

        <Space>
          <Button
            type={showAdmins && !myOversight ? 'primary' : 'default'}
            ghost={showAdmins && !myOversight}
            onClick={() => { setShowAdmins((v) => !v); setMyOversight(false) }}
            size="middle"
          >
            Адміни
          </Button>
          <Button
            type={myOversight ? 'primary' : 'default'}
            ghost={myOversight}
            onClick={() => { setMyOversight((v) => !v); if (!myOversight) setShowAdmins(false) }}
            size="middle"
          >
            Під моєю опікою
          </Button>
        </Space>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
          {filtered.length} осіб
        </span>
      </Flex>

      {/* Table */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey={(m) => (m.isAdmin ? `u_${m.userId}` : `p_${m.id}`)}
        loading={loading}
        pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true }}
        onRow={(m) => ({
          onClick: () => handleItemClick(m),
          style: { cursor: 'pointer' },
        })}
        size="middle"
        scroll={{ x: 800 }}
        locale={{ emptyText: 'Людей не знайдено' }}
        style={{ background: '#fff', borderRadius: 12 }}
      />
    </div>
  )
}

