import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { TabBar } from 'antd-mobile'
import { AppOutline, UserOutline, TeamOutline } from 'antd-mobile-icons'

const tabs = [
  { key: '/groups', title: 'Групи', icon: <TeamOutline /> },
  { key: '/people', title: 'Люди', icon: <UserOutline /> },
  { key: '/', title: 'Головна', icon: <AppOutline /> },
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
