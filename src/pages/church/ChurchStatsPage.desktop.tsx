import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, Select, Button, Spin, Typography, Table, Space, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { churchServicesApi, SERVICE_TYPES, type ServiceType, type ChurchServiceStats } from '@/api/churchServices'

const { Title } = Typography
const MONTH_NAMES = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']

type RangeKey = '3m' | '6m' | '1y' | 'all'
function rangeFrom(key: RangeKey): string | undefined {
  if (key === 'all') return undefined
  const d = new Date()
  if (key === '3m') d.setMonth(d.getMonth() - 3)
  if (key === '6m') d.setMonth(d.getMonth() - 6)
  if (key === '1y') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

// ── SVG line chart ────────────────────────────────────────────────────────────
function LineChart({ data, color, label }: { data: { month: string; value: number }[]; color: string; label: string }) {
  if (data.length < 2) return <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Недостатньо даних</div>
  const W = 600, H = 140, PADX = 40, PADY = 16
  const max = Math.max(...data.map((d) => d.value), 1)
  const xs = data.map((_, i) => PADX + (i / (data.length - 1)) * (W - PADX * 2))
  const ys = data.map((d) => PADY + (1 - d.value / max) * (H - PADY * 2))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PADY + (1 - t) * (H - PADY * 2)
          return <line key={t} x1={PADX} y1={y} x2={W - PADX} y2={y} stroke="#e5e7eb" strokeWidth="1" />
        })}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="4" fill={color} />
            <text x={x} y={H - 2} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {(() => { const [yr, mo] = data[i].month.split('-'); return `${MONTH_NAMES[parseInt(mo) - 1].slice(0, 3)} ${yr}` })()}
            </text>
            <text x={x} y={ys[i] - 8} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
              {data[i].value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function ChurchStatsPageDesktop() {
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState<ServiceType>('sunday_1')
  const [range, setRange] = useState<RangeKey>('6m')
  const [stats, setStats] = useState<ChurchServiceStats | null>(null)
  const [loading, setLoading] = useState(false)

  const activeTypeMeta = SERVICE_TYPES.find((t) => t.key === activeType)!

  const load = async () => {
    setLoading(true)
    try {
      const from = rangeFrom(range)
      const data = await churchServicesApi.getStats({ type: activeType, from })
      setStats(data)
    } catch {
      message.error('Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeType, range])

  const handleExport = async () => {
    try {
      const blob = await churchServicesApi.export({ type: activeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `church-services-${activeType}-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Помилка експорту')
    }
  }

  // Year-over-year table columns
  const yoyYears = stats ? [...new Set(stats.yearOverYear.map((p) => p.year))].sort() : []
  const yoyMonths = stats ? [...new Set(stats.yearOverYear.map((p) => p.month))].sort((a, b) => a - b) : []
  const yoyByMonth: Record<number, Record<number, number>> = {}
  stats?.yearOverYear.forEach((p) => {
    if (!yoyByMonth[p.month]) yoyByMonth[p.month] = {}
    yoyByMonth[p.month][p.year] = p.totalAttendance
  })

  const yoyColumns: ColumnsType<{ month: number }> = [
    { title: 'Місяць', dataIndex: 'month', key: 'month', render: (m: number) => MONTH_NAMES[m - 1] },
    ...yoyYears.map((y) => ({
      title: String(y),
      key: String(y),
      render: (_: unknown, row: { month: number }) => {
        const v = yoyByMonth[row.month]?.[y]
        return v != null ? <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{v}</span> : '—'
      },
    })),
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Статистика служіння</Title>
        <Space>
          <Select
            value={range}
            onChange={setRange}
            style={{ width: 100 }}
            options={[
              { value: '3m', label: '3 місяці' },
              { value: '6m', label: '6 місяців' },
              { value: '1y', label: '1 рік' },
              { value: 'all', label: 'Всі' },
            ]}
          />
          <Button onClick={handleExport}>Експорт Excel</Button>
          <Button onClick={() => navigate('/church')}>← Записи</Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeType}
        onChange={(key) => setActiveType(key as ServiceType)}
        items={SERVICE_TYPES.map((t) => ({ key: t.key, label: t.label }))}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spin /></div>
      ) : !stats || stats.monthly.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 64 }}>Даних за цей період немає</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Trend chart - attendance */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Тенденція присутності</div>
            <LineChart
              data={stats.monthly.map((m) => ({ month: m.month, value: m.totalAttendance }))}
              color="#3B82F6"
              label="Кількість присутніх"
            />
          </div>

          {/* Communion trend */}
          {activeTypeMeta.hasCommunion && stats.monthly.some((m) => m.totalCommunion != null) && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Причастя</div>
              <LineChart
                data={stats.monthly.map((m) => ({ month: m.month, value: m.totalCommunion ?? 0 }))}
                color="#8B5CF6"
                label="Кількість причасників"
              />
            </div>
          )}

          {/* Monthly table */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>По місяцях</div>
            <Table
              dataSource={[...stats.monthly].reverse().map((m) => ({ ...m, key: m.month }))}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Місяць', dataIndex: 'month', key: 'month',
                  render: (v: string) => {
                    const [yr, mo] = v.split('-')
                    return `${MONTH_NAMES[parseInt(mo) - 1]} ${yr}`
                  },
                },
                {
                  title: 'Присутніх', dataIndex: 'totalAttendance', key: 'att',
                  render: (v: number) => <span style={{ fontWeight: 600, color: '#3B82F6' }}>{v}</span>,
                },
                ...(activeTypeMeta.hasCommunion ? [{
                  title: 'Причастя', dataIndex: 'totalCommunion', key: 'com',
                  render: (v: number | null) => v != null ? <span style={{ fontWeight: 600, color: '#8B5CF6' }}>{v}</span> : '—',
                }] : []),
                { title: 'Зібрань', dataIndex: 'recordCount', key: 'cnt' },
              ]}
            />
          </div>

          {/* Year-over-year */}
          {yoyYears.length >= 2 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Порівняння по роках</div>
              <Table
                dataSource={yoyMonths.map((m) => ({ month: m, key: m }))}
                columns={yoyColumns}
                pagination={false}
                size="small"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
