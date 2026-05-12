import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AppOutline, UserOutline, SetOutline } from 'antd-mobile-icons'
import type { FC } from 'react'

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  )
}

function CabinetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
    </svg>
  )
}

const tabs: { key: string; title: string; icon: FC }[] = [
  { key: '/', title: 'Дашборд', icon: AppOutline },
  { key: '/people', title: 'Люди', icon: UserOutline },
  { key: '/cabinet', title: 'Кабінет', icon: CabinetIcon },
  { key: '/profile', title: 'Профіль', icon: ProfileIcon },
  { key: '/settings', title: 'Налаштування', icon: SetOutline },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeKey = tabs.find((t) => t.key !== '/' && pathname.startsWith(t.key))?.key ?? '/'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </div>

      <div style={{
        background: '#fff',
        boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -6px 20px rgba(0,0,0,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', height: 58 }}>
          {tabs.map(({ key, title, icon: Icon }) => {
            const active = activeKey === key
            return (
              <button
                key={key}
                onClick={() => navigate(key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  transition: 'color 0.15s',
                  padding: 0,
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 28,
                    height: 3,
                    background: 'var(--color-primary)',
                    borderRadius: '0 0 4px 4px',
                  }} />
                )}
                <span style={{ fontSize: 22, lineHeight: 1, display: 'flex' }}>
                  <Icon />
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                }}>
                  {title}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
