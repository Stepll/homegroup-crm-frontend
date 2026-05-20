import { useNavigate } from 'react-router-dom'
import { Button, Spin, Flex } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useAuth } from '@/store/auth'
import { useDashboardPage } from './useDashboardPage'
import { AttendanceWidget } from './widgets/AttendanceWidget'
import { GroupStatsWidget } from './widgets/GroupStatsWidget'
import { UpcomingEventsWidget } from './widgets/UpcomingEventsWidget'
import type { ComponentType } from 'react'

const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  attendance: AttendanceWidget,
  groupStats: GroupStatsWidget,
  upcomingEvents: UpcomingEventsWidget,
}

// widgets that prefer full width on desktop (tall/complex)
const FULL_WIDTH_WIDGETS = new Set(['groupStats'])

export function DashboardPageDesktop() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { enabledWidgets, loading } = useDashboardPage()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Дашборд</h1>
          {user?.name && (
            <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>Привіт, {user.name}</span>
          )}
        </div>
        <Button icon={<SettingOutlined />} onClick={() => navigate('/dashboard/settings')}>
          Редагувати блоки
        </Button>
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: 64 }}>
          <Spin size="large" />
        </Flex>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}>
          {enabledWidgets.map((w) => {
            const Component = WIDGET_COMPONENTS[w.id]
            if (!Component) return null
            return (
              <div
                key={w.id}
                style={FULL_WIDTH_WIDGETS.has(w.id) ? { gridColumn: '1 / -1' } : undefined}
              >
                <Component />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
