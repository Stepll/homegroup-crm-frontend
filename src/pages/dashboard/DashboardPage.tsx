import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetOutline } from 'antd-mobile-icons'
import { useAuth } from '@/store/auth'
import { loadWidgetConfig, type WidgetConfig } from './widgetRegistry'
import { AttendanceWidget } from './widgets/AttendanceWidget'
import type { ComponentType } from 'react'

const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  attendance: AttendanceWidget,
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [config, setConfig] = useState<WidgetConfig[]>([])

  useEffect(() => {
    if (user?.email) setConfig(loadWidgetConfig(user.email))
  }, [user?.email])

  const enabledWidgets = config.filter((w) => w.enabled)

  return (
    <div style={{ padding: '12px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Дашборд</span>
        {user?.name && (
          <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>Привіт, {user.name}</span>
        )}
      </div>

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
    </div>
  )
}
