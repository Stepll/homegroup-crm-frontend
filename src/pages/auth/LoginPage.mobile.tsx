import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Toast } from 'antd-mobile'
import { EyeInvisibleOutline, EyeOutline } from 'antd-mobile-icons'
import { authApi } from '@/api/auth'
import { useAuth } from '@/store/auth'

export function LoginPageMobile() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<'email' | 'password' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      Toast.show({ content: 'Заповніть усі поля', icon: 'fail' })
      return
    }
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      login(data)
      navigate('/', { replace: true })
    } catch {
      Toast.show({ content: 'Невірний email або пароль', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = (name: 'email' | 'password'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: `1.5px solid ${focused === name ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '11px 14px',
    background: focused === name ? '#fff' : '#F9FAFB',
    transition: 'border-color 0.18s, background 0.18s',
  })

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(155deg, #074F63 0%, #0E7A96 40%, #2AAFCA 75%, #46C8DC 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'white',
        borderRadius: 'var(--radius-2xl)',
        padding: '20px 28px 20px',
        boxShadow: 'var(--shadow-xl)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <img
            src="/logo.svg"
            alt="Philad Homegroup"
            style={{ width: 200, height: 200, display: 'block' }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 6px',
          textAlign: 'center',
          fontSize: 'var(--font-xl)',
          fontWeight: 700,
          color: 'var(--color-text)',
          letterSpacing: '-0.02em',
        }}>
          Philad Homegroup CRM
        </h1>
        <p style={{
          margin: '0 0 20px',
          textAlign: 'center',
          fontSize: 'var(--font-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          Управління домашніми групами
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-sm)',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 'var(--space-2)',
            }}>
              Email
            </label>
            <div style={fieldStyle('email')}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="your@email.com"
                autoComplete="email"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 'var(--font-base)',
                  color: 'var(--color-text)',
                  padding: 0,
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-sm)',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 'var(--space-2)',
            }}>
              Пароль
            </label>
            <div style={fieldStyle('password')}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 'var(--font-base)',
                  color: 'var(--color-text)',
                  padding: 0,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 18,
                }}
              >
                {showPassword ? <EyeOutline /> : <EyeInvisibleOutline />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            block
            loading={loading}
            style={{
              '--background-color': 'var(--color-primary)',
              '--border-color': 'var(--color-primary)',
              '--text-color': '#fff',
              '--border-radius': 'var(--radius-md)',
              height: '48px',
              fontSize: 'var(--font-base)',
              fontWeight: 600,
              letterSpacing: '0.01em',
            } as React.CSSProperties}
          >
            Увійти
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 'var(--space-6)',
        fontSize: 'var(--font-xs)',
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: '0.04em',
      }}>
        PHILAD CHURCH · HOMEGROUP CRM
      </p>
    </div>
  )
}
