import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Toast, NavBar } from 'antd-mobile'
import { authApi } from '@/api/auth'
import { useAuth } from '@/store/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const data = await authApi.login(values.email, values.password)
      login(data)
      navigate('/', { replace: true })
    } catch {
      Toast.show({ content: 'Невірний email або пароль', icon: 'fail' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <NavBar back={null}>HomeGroup CRM</NavBar>
      <div style={{ padding: '24px 16px' }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>Вхід</h2>
        <Form onFinish={onFinish} layout="vertical" footer={
          <Button block type="submit" color="primary" size="large" loading={loading}>
            Увійти
          </Button>
        }>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input type="email" placeholder="your@email.com" />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 6 }]}>
            <Input type="password" placeholder="••••••" />
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
