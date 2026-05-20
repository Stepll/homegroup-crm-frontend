import { useNavigate } from 'react-router-dom'
import { Card, Typography, Row, Col } from 'antd'
import {
  TeamOutlined, SafetyCertificateOutlined, HomeOutlined,
  TagsOutlined, LayoutOutlined,
} from '@ant-design/icons'
import { useAuth } from '@/store/auth'

const { Title, Text } = Typography

const ITEMS = [
  { label: 'Адміни', description: 'Управління адміністраторами', path: '/settings/admins', permission: 'settings.admins', icon: <TeamOutlined style={{ fontSize: 24, color: '#2AAFCA' }} /> },
  { label: 'Ролі', description: 'Права доступу та ролі', path: '/settings/roles', permission: 'settings.roles', icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: '#6366F1' }} /> },
  { label: 'Домашні групи', description: 'Налаштування груп', path: '/settings/home-groups', permission: 'settings.groups', icon: <HomeOutlined style={{ fontSize: 24, color: '#8B5CF6' }} /> },
  { label: 'Статуси людей', description: 'Кольорові мітки статусів', path: '/settings/person-statuses', permission: 'settings.statuses', icon: <TagsOutlined style={{ fontSize: 24, color: '#F59E0B' }} /> },
  { label: 'Кімнати', description: 'Кімнати для бронювання', path: '/settings/rooms', permission: 'settings.rooms', icon: <LayoutOutlined style={{ fontSize: 24, color: '#10B981' }} /> },
]

export function SettingsPageDesktop() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const items = ITEMS.filter((i) => hasPermission(i.permission))

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Налаштування</Title>
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col key={item.path} xs={24} sm={12} lg={8}>
            <Card
              hoverable
              onClick={() => navigate(item.path)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {item.icon}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{item.label}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
