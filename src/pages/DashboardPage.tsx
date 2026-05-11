import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Card, Grid, Button } from 'antd-mobile'
import { useAuth } from '@/store/auth'
import { groupsApi } from '@/api/groups'
import { peopleApi } from '@/api/people'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ groups: 0, people: 0 })

  useEffect(() => {
    Promise.all([groupsApi.getAll(), peopleApi.getAll()]).then(([groups, people]) => {
      setStats({ groups: groups.length, people: people.length })
    })
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <NavBar back={null} right={<Button size="small" onClick={handleLogout}>Вийти</Button>}>
        HomeGroup CRM
      </NavBar>
      <div style={{ padding: 16 }}>
        <p style={{ marginBottom: 16, color: '#999' }}>Привіт, {user?.name}!</p>
        <Grid columns={2} gap={12}>
          <Grid.Item>
            <Card onClick={() => navigate('/groups')} style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1677ff' }}>{stats.groups}</div>
              <div style={{ color: '#666' }}>Груп</div>
            </Card>
          </Grid.Item>
          <Grid.Item>
            <Card onClick={() => navigate('/people')} style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1677ff' }}>{stats.people}</div>
              <div style={{ color: '#666' }}>Людей</div>
            </Card>
          </Grid.Item>
        </Grid>
      </div>
    </div>
  )
}
