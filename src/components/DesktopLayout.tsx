import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppstoreOutlined,
  TeamOutlined,
  CalendarOutlined,
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  UsergroupAddOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  ApartmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { useAuth } from '@/store/auth'

const { Sider, Content } = Layout

type MenuItem = Required<MenuProps>['items'][number]

export function DesktopLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { hasPermission } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const items: MenuItem[] = [
    hasPermission('page.dashboard') && {
      key: '/',
      icon: <AppstoreOutlined />,
      label: 'Дашборд',
    },
    hasPermission('page.people') && {
      key: '/people',
      icon: <TeamOutlined />,
      label: 'Люди',
    },
    hasPermission('page.calendar') && {
      key: '/calendar',
      icon: <CalendarOutlined />,
      label: 'Календар',
    },
    hasPermission('page.cabinet') && {
      key: '/cabinet',
      icon: <HomeOutlined />,
      label: 'Домашка',
    },
    hasPermission('church.attendance.view') && {
      key: '/church',
      icon: <StarOutlined />,
      label: 'Служіння',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Профіль',
    },
    hasPermission('page.settings') && {
      key: 'settings-group',
      icon: <SettingOutlined />,
      label: 'Налаштування',
      children: [
        hasPermission('settings.admins') && {
          key: '/settings/admins',
          icon: <UsergroupAddOutlined />,
          label: 'Адміни',
        },
        hasPermission('settings.roles') && {
          key: '/settings/roles',
          icon: <SafetyCertificateOutlined />,
          label: 'Ролі',
        },
        hasPermission('settings.groups') && {
          key: '/settings/home-groups',
          icon: <HomeOutlined />,
          label: 'Домашки',
        },
        hasPermission('settings.statuses') && {
          key: '/settings/person-statuses',
          icon: <TagsOutlined />,
          label: 'Статуси',
        },
        hasPermission('settings.rooms') && {
          key: '/settings/rooms',
          icon: <ApartmentOutlined />,
          label: 'Кімнати',
        },
      ].filter(Boolean) as MenuItem[],
    },
  ].filter(Boolean) as MenuItem[]

  const selectedKey = (() => {
    if (pathname.startsWith('/settings/admins')) return '/settings/admins'
    if (pathname.startsWith('/settings/roles')) return '/settings/roles'
    if (pathname.startsWith('/settings/home-groups')) return '/settings/home-groups'
    if (pathname.startsWith('/settings/person-statuses')) return '/settings/person-statuses'
    if (pathname.startsWith('/settings/rooms')) return '/settings/rooms'
    if (pathname.startsWith('/settings')) return '/settings/admins'
    if (pathname.startsWith('/cabinet')) return '/cabinet'
    if (pathname.startsWith('/people')) return '/people'
    if (pathname.startsWith('/calendar')) return '/calendar'
    if (pathname.startsWith('/profile')) return '/profile'
    if (pathname.startsWith('/admins')) return '/profile'
    return '/'
  })()

  const openKeys = pathname.startsWith('/settings') ? ['settings-group'] : []

  return (
    <Layout style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={220}
        collapsedWidth={64}
        style={{
          background: '#fff',
          borderRight: '1px solid var(--color-border)',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo + collapse toggle */}
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 20px' : '0 20px',
          borderBottom: '1px solid var(--color-border)',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-primary)', letterSpacing: '-0.3px' }}>
              HomeGroup CRM
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: 16,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 6,
              transition: 'background 0.15s',
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={items}
          onClick={({ key }) => {
            if (key !== 'settings-group') navigate(key)
          }}
          style={{
            border: 'none',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: 8,
          }}
          inlineCollapsed={collapsed}
        />
      </Sider>

      <Layout style={{
        marginLeft: collapsed ? 64 : 220,
        transition: 'margin-left 0.2s',
        background: 'var(--color-bg)',
        minHeight: '100dvh',
      }}>
        <Content style={{ overflowY: 'auto', height: '100dvh' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
