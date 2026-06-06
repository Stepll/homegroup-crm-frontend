import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal } from 'antd'
import { authApi } from '@/api/auth'
import { useAuth } from '@/store/auth'

export function LoginPageDesktop() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      Modal.error({ title: 'Заповніть усі поля' })
      return
    }
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      login(data)
      navigate('/', { replace: true })
    } catch {
      Modal.error({ title: 'Невірний email або пароль' })
    } finally {
      setLoading(false)
    }
  }

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
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'white',
        borderRadius: 20,
        padding: '28px 36px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <img src="/logo.svg" alt="Philad Homegroup" style={{ width: 180, height: 180, display: 'block' }} />
        </div>

        <h1 style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 22, fontWeight: 700, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.02em' }}>
          Philad Homegroup CRM
        </h1>
        <p style={{ margin: '0 0 24px', textAlign: 'center', fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
          Управління домашніми групами
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Email<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span></div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              size="large"
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={labelStyle}>Пароль<span style={{ color: '#EF4444', marginLeft: 4 }}>*</span></div>
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              size="large"
            />
          </div>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            style={{ fontWeight: 600, height: 48, fontSize: 16 }}
          >
            Увійти
          </Button>
        </form>
      </div>

      <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
        PHILAD CHURCH · HOMEGROUP CRM
      </p>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.65)', marginBottom: 6,
}
