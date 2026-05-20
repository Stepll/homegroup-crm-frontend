import { useNavigate } from 'react-router-dom'
import { NavBar, List } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'
import { useAuth } from '@/store/auth'

const ALL_ITEMS = [
  { label: 'Адміни', path: '/settings/admins', permission: 'settings.admins' },
  { label: 'Ролі', path: '/settings/roles', permission: 'settings.roles' },
  { label: 'Домашні групи', path: '/settings/home-groups', permission: 'settings.groups' },
  { label: 'Статуси людей', path: '/settings/person-statuses', permission: 'settings.statuses' },
  { label: 'Кімнати для бронювання', path: '/settings/rooms', permission: 'settings.rooms' },
]

export function SettingsPageMobile() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()

  const items = ALL_ITEMS.filter((item) => hasPermission(item.permission))

  return (
    <div>
      <NavBar back={null}>Налаштування</NavBar>
      <List style={{ marginTop: 12 }}>
        {items.map((item) => (
          <List.Item
            key={item.path}
            arrow={<RightOutline />}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </List.Item>
        ))}
      </List>
    </div>
  )
}
