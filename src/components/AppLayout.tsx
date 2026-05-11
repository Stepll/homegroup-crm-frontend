import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { TabBar } from 'antd-mobile'
import { AppOutline, UserOutline, TeamOutline, UserSetOutline } from 'antd-mobile-icons'

const tabs = [
  { key: '/', title: 'Дашборд', icon: <AppOutline /> },
  { key: '/admins', title: 'Адміни', icon: <UserSetOutline /> },
  { key: '/people', title: 'Люди', icon: <UserOutline /> },
  { key: '/groups', title: 'Групи', icon: <TeamOutline /> },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeKey = tabs.find((t) => t.key !== '/' && pathname.startsWith(t.key))?.key ?? '/'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </div>
      <TabBar activeKey={activeKey} onChange={(key) => navigate(key)}>
        {tabs.map((tab) => (
          <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
        ))}
      </TabBar>
    </div>
  )
}
