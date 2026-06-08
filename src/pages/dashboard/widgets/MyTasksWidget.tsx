import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SpinLoading, Toast } from 'antd-mobile'
import { CheckOutline } from 'antd-mobile-icons'
import { adminsApi } from '@/api/admins'
import type { AdminTask } from '@/types'

export function MyTasksWidget() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminsApi.getMyTasks()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (task: AdminTask, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await adminsApi.toggleMyTask(task.id)
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    } catch {
      Toast.show({ content: 'Не вдалось оновити', icon: 'fail' })
    }
  }

  const pending = tasks.filter((t) => !t.isCompleted)
  const completed = tasks.filter((t) => t.isCompleted)

  return (
    <div style={widgetWrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={sectionLabel}>Мої задачі</span>
          {pending.length > 0 && (
            <span style={badge}>{pending.length}</span>
          )}
        </div>
        <button onClick={() => navigate('/profile')} style={linkBtn}>Профіль</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <SpinLoading color="primary" style={{ '--size': '20px' } as React.CSSProperties} />
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Немає задач
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 280, overflowY: 'auto' }}>
          {[...pending, ...completed].map((task) => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 10px', borderRadius: 8,
              background: task.isCompleted ? '#F3F4F6' : '#FAFAFB',
              border: '1px solid var(--color-border-light)',
              opacity: task.isCompleted ? 0.7 : 1,
            }}>
              <button
                onClick={(e) => toggle(task, e)}
                title={task.isCompleted ? 'Відновити' : 'Виконано'}
                style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${task.isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
                  background: task.isCompleted ? 'var(--color-success)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}>
                {task.isCompleted && <CheckOutline style={{ fontSize: 14, color: '#fff' }} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: task.isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text)',
                  textDecoration: task.isCompleted ? 'line-through' : 'none',
                }}>
                  {task.title}
                </div>
                {task.description && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
                    {task.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const widgetWrap: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  marginBottom: 12,
  boxShadow: 'var(--shadow-sm)',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const badge: React.CSSProperties = {
  background: 'var(--color-error)', color: '#fff',
  borderRadius: '50%', minWidth: 18, height: 18,
  fontSize: 11, fontWeight: 700, lineHeight: '18px',
  textAlign: 'center', padding: '0 4px',
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--color-primary)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  padding: 0,
}
