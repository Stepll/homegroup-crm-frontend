import { useNavigate } from 'react-router-dom'
import { NavBar } from 'antd-mobile'

export function AdminsPage() {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar onBack={() => navigate('/settings')}>Адміни</NavBar>
      <div style={{ padding: 16, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 60 }}>
        Список адміністраторів
      </div>
    </div>
  )
}
