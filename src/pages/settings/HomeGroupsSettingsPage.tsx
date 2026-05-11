import { useNavigate } from 'react-router-dom'
import { NavBar } from 'antd-mobile'

export function HomeGroupsSettingsPage() {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar onBack={() => navigate('/settings')}>Домашні групи</NavBar>
      <div style={{ padding: 16, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 60 }}>
        Налаштування домашніх груп
      </div>
    </div>
  )
}
