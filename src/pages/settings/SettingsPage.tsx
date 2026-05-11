import { useNavigate } from 'react-router-dom'
import { NavBar, List } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'

const items = [
  { label: 'Адміни', path: '/settings/admins' },
  { label: 'Ролі', path: '/settings/roles' },
  { label: 'Домашні групи', path: '/settings/home-groups' },
]

export function SettingsPage() {
  const navigate = useNavigate()

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
