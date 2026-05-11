import { useNavigate } from 'react-router-dom'
import { NavBar, Button } from 'antd-mobile'
import { useAuth } from '@/store/auth'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar back={null}>Профіль</NavBar>

      <div style={{ flex: 1, padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.02em',
          boxShadow: '0 4px 16px rgba(42,175,202,0.35)',
        }}>
          {initials}
        </div>

        {/* Name */}
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
            {user?.name}
          </div>
          <div style={{
            display: 'inline-block',
            background: 'var(--color-primary-bg)',
            color: 'var(--color-primary-dark)',
            fontSize: 'var(--font-xs)',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            letterSpacing: '0.04em',
          }}>
            {user?.role}
          </div>
        </div>

        {/* Email */}
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-sm)' }}>
          {user?.email}
        </div>

        <div style={{ flex: 1 }} />

        {/* Logout */}
        <Button
          block
          onClick={handleLogout}
          style={{
            '--border-color': 'var(--color-border)',
            '--text-color': 'var(--color-error)',
            '--border-radius': 'var(--radius-md)',
            height: 48,
            fontSize: 'var(--font-base)',
            fontWeight: 600,
          } as React.CSSProperties}
        >
          Вийти
        </Button>
      </div>
    </div>
  )
}
