import { NavBar } from 'antd-mobile'

export function AdminsPage() {
  return (
    <div>
      <NavBar back={null}>Адміни</NavBar>
      <div style={{ padding: 16, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 60 }}>
        Список адміністраторів
      </div>
    </div>
  )
}
