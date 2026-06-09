import { useNavigate } from 'react-router-dom'
import { SetOutline } from 'antd-mobile-icons'
import { SpinLoading } from 'antd-mobile'
import { useAuth } from '@/store/auth'
import { useDashboardPage } from './useDashboardPage'
import { AttendanceWidget } from './widgets/AttendanceWidget'
import { GroupStatsWidget } from './widgets/GroupStatsWidget'
import { UpcomingEventsWidget } from './widgets/UpcomingEventsWidget'
import { MyTasksWidget } from './widgets/MyTasksWidget'
import { MyOversightWidget } from './widgets/MyOversightWidget'
import { InactiveMembersWidget } from './widgets/InactiveMembersWidget'
import { GroupsComparisonWidget } from './widgets/GroupsComparisonWidget'
import { StatusDistributionWidget } from './widgets/StatusDistributionWidget'
import { GroupsAttendanceSummaryWidget } from './widgets/GroupsAttendanceSummaryWidget'
import { RandomNeedWidget } from './widgets/RandomNeedWidget'
import type { ComponentType } from 'react'

const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  attendance: AttendanceWidget,
  myTasks: MyTasksWidget,
  myOversight: MyOversightWidget,
  inactiveMembers: InactiveMembersWidget,
  groupsComparison: GroupsComparisonWidget,
  statusDistribution: StatusDistributionWidget,
  groupsAttendanceSummary: GroupsAttendanceSummaryWidget,
  groupStats: GroupStatsWidget,
  upcomingEvents: UpcomingEventsWidget,
  randomNeed: RandomNeedWidget,
}

export function DashboardPageMobile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { enabledWidgets, loading } = useDashboardPage()

  return (
    <div style={{ padding: '12px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Дашборд</span>
        {user?.name && (
          <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>Привіт, {user.name}</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <SpinLoading color="primary" />
        </div>
      ) : (
        <>
          {enabledWidgets.map((w) => {
            const Component = WIDGET_COMPONENTS[w.id]
            if (!Component) return null
            return <Component key={w.id} />
          })}

          <button
            onClick={() => navigate('/dashboard/settings')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '22px 16px', gap: 8,
              border: '2.5px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)', background: 'transparent', cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <SetOutline style={{ fontSize: 22 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Редагувати блоки</span>
          </button>
        </>
      )}
    </div>
  )
}
