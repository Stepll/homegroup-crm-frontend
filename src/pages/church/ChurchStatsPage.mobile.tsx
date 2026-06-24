import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, SpinLoading, Toast } from 'antd-mobile'
import { churchServicesApi, SERVICE_TYPES, type ServiceType, type ChurchServiceStats } from '@/api/churchServices'

const MONTH_NAMES = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру']

type RangeKey = '3m' | '6m' | '1y' | 'all'
const RANGES: { key: RangeKey; label: string }[] = [
  { key: '3m', label: '3 міс' },
  { key: '6m', label: '6 міс' },
  { key: '1y', label: '1 рік' },
  { key: 'all', label: 'Всі' },
]

function rangeFrom(key: RangeKey): string | undefined {
  if (key === 'all') return undefined
  const d = new Date()
  if (key === '3m') d.setMonth(d.getMonth() - 3)
  if (key === '6m') d.setMonth(d.getMonth() - 6)
  if (key === '1y') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

// ── Mini SVG line chart ───────────────────────────────────────────────────────
function LineChart({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null
  const W = 320, H = 80, PAD = 8
  const max = Math.max(...points, 1)
  const xs = points.map((_, i) => PAD + (i / (points.length - 1)) * (W - PAD * 2))
  const ys = points.map((v) => PAD + (1 - v / max) * (H - PAD * 2))
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3.5" fill={color} />
      ))}
    </svg>
  )
}

export function ChurchStatsPageMobile() {
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
      Toast.show({ content: 'Помилка завантаження', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeType, range])

  const handleExport = async () => {
    try {
      const blob = await churchServicesApi.export()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `church-services-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      Toast.show({ content: 'Помилка експорту', icon: 'fail' })
    }
  }

  // Year-over-year: group by month, collect years
  const yoyData = (() => {
    if (!stats) return null
    const byMonth: Record<number, Record<number, number>> = {}
    for (const p of stats.yearOverYear) {
      if (!byMonth[p.month]) byMonth[p.month] = {}
      byMonth[p.month][p.year] = p.totalAttendance
    }
    const years = [...new Set(stats.yearOverYear.map((p) => p.year))].sort()
    const months = [...new Set(stats.yearOverYear.map((p) => p.month))].sort((a, b) => a - b)
    return { byMonth, years, months }
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <button
            onClick={handleExport}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, padding: 0 }}
          >
            Експорт
          </button>
        }
      >
        Статистика служіння
      </NavBar>

      {/* Type tabs */}
      <div style={{ overflowX: 'auto', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {SERVICE_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              style={{
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: activeType === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeType === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeType === t.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: range === r.key ? 'var(--color-primary)' : 'var(--color-border)',
              background: range === r.key ? 'var(--color-primary)' : 'transparent',
              color: range === r.key ? '#fff' : 'var(--color-text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><SpinLoading /></div>
        ) : !stats || stats.monthly.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 48, fontSize: 14 }}>
            Даних за цей період немає
          </div>
        ) : (
          <>
            {/* Trend chart */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 14px 10px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Тенденція — присутні</div>
              <LineChart points={stats.monthly.map((m) => m.totalAttendance)} color="var(--color-primary)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {stats.monthly.map((m) => {
                  const [, mo] = m.month.split('-')
                  return (
                    <div key={m.month} style={{ fontSize: 9, color: 'var(--color-text-tertiary)', flex: 1, textAlign: 'center' }}>
                      {MONTH_NAMES[parseInt(mo) - 1]}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Communion trend */}
            {activeTypeMeta.hasCommunion && stats.monthly.some((m) => m.totalCommunion != null) && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '14px 14px 10px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Тенденція — причастя</div>
                <LineChart
                  points={stats.monthly.map((m) => m.totalCommunion ?? 0)}
                  color="#8B5CF6"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {stats.monthly.map((m) => {
                    const [, mo] = m.month.split('-')
                    return (
                      <div key={m.month} style={{ fontSize: 9, color: 'var(--color-text-tertiary)', flex: 1, textAlign: 'center' }}>
                        {MONTH_NAMES[parseInt(mo) - 1]}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Monthly stats cards */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>По місяцях</div>
              {[...stats.monthly].reverse().map((m) => {
                const [yr, mo] = m.month.split('-')
                return (
                  <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <div style={{ fontSize: 13 }}>{MONTH_NAMES[parseInt(mo) - 1]} {yr}</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Присутніх</div>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{m.totalAttendance}</div>
                      </div>
                      {activeTypeMeta.hasCommunion && m.totalCommunion != null && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Причастя</div>
                          <div style={{ fontWeight: 700, color: '#8B5CF6' }}>{m.totalCommunion}</div>
                        </div>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>Зібрань</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{m.recordCount}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Year-over-year */}
            {yoyData && yoyData.years.length >= 2 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Порівняння по роках</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Місяць</th>
                        {yoyData.years.map((y) => (
                          <th key={y} style={{ textAlign: 'right', padding: '4px 6px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{y}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {yoyData.months.map((mo) => (
                        <tr key={mo} style={{ borderTop: '1px solid var(--color-border-light)' }}>
                          <td style={{ padding: '6px 6px', color: 'var(--color-text-secondary)' }}>{MONTH_NAMES[mo - 1]}</td>
                          {yoyData.years.map((y) => {
                            const val = yoyData.byMonth[mo]?.[y]
                            return (
                              <td key={y} style={{ padding: '6px 6px', textAlign: 'right', fontWeight: val != null ? 600 : 400, color: val != null ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                                {val != null ? val : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
