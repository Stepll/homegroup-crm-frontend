import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavBar, Button } from 'antd-mobile'
import { useAuth } from '@/store/auth'
import { ALL_WIDGETS, loadWidgetConfig, saveWidgetConfig } from './widgetRegistry'

function DragHandleIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
      <rect y="0" width="18" height="2" rx="1" />
      <rect y="6" width="18" height="2" rx="1" />
      <rect y="12" width="18" height="2" rx="1" />
    </svg>
  )
}

export function DashboardSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const initialConfig = user ? loadWidgetConfig(user.email) : []

  // enabledOrder: IDs of enabled widgets in display order
  const [enabledOrder, setEnabledOrder] = useState<string[]>(
    () => initialConfig.filter((w) => w.enabled).map((w) => w.id)
  )
  // enabledSet: which widget IDs are enabled
  const [enabledSet, setEnabledSet] = useState<Set<string>>(
    () => new Set(initialConfig.filter((w) => w.enabled).map((w) => w.id))
  )

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleSave = () => {
    if (!user?.email) return
    const config = [
      ...enabledOrder.map((id) => ({ id, enabled: true })),
      ...ALL_WIDGETS
        .filter((w) => !enabledSet.has(w.id))
        .map((w) => ({ id: w.id, enabled: false })),
    ]
    saveWidgetConfig(user.email, config)
    navigate(-1)
  }

  const toggleWidget = (id: string) => {
    setEnabledSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setEnabledOrder((o) => o.filter((x) => x !== id))
      } else {
        next.add(id)
        setEnabledOrder((o) => [...o, id])
      }
      return next
    })
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    setEnabledOrder((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveDown = (index: number) => {
    setEnabledOrder((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  // HTML5 drag-and-drop handlers
  const handleDragStart = (id: string) => setDragId(id)

  const handleDragEnter = (id: string) => {
    if (!dragId || dragId === id) return
    setDragOverId(id)
    setEnabledOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(dragId)
      const toIdx = next.indexOf(id)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragId)
      return next
    })
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const widgetLabel = (id: string) =>
    ALL_WIDGETS.find((w) => w.id === id)?.label ?? id

  return (
    <div style={{ paddingBottom: 32 }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <Button size="small" color="primary" onClick={handleSave}>
            Зберегти
          </Button>
        }
      >
        Блоки дашборду
      </NavBar>

      {/* Active blocks section */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={sectionLabel}>Вибрані блоки</div>
      </div>

      {enabledOrder.length === 0 ? (
        <div style={{ padding: '12px 16px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Жодного блоку не вибрано
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {enabledOrder.map((id, index) => (
            <div
              key={id}
              draggable
              onDragStart={() => handleDragStart(id)}
              onDragEnter={() => handleDragEnter(id)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 14px',
                background: dragOverId === id ? 'var(--color-bg)' : '#fff',
                border: `1.5px solid ${dragId === id ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                borderRadius: 'var(--radius-md)',
                opacity: dragId === id ? 0.5 : 1,
                transition: 'opacity 0.1s, border-color 0.1s',
                cursor: 'grab',
              }}
            >
              {/* Drag handle */}
              <span style={{ color: 'var(--color-text-tertiary)', display: 'flex', flexShrink: 0, cursor: 'grab' }}>
                <DragHandleIcon />
              </span>

              {/* Label */}
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
                {widgetLabel(id)}
              </span>

              {/* Up/Down for mobile */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  style={arrowBtn(index === 0)}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === enabledOrder.length - 1}
                  style={arrowBtn(index === enabledOrder.length - 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All blocks section */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={sectionLabel}>Всі блоки</div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ALL_WIDGETS.map((w) => {
          const checked = enabledSet.has(w.id)
          return (
            <button
              key={w.id}
              onClick={() => toggleWidget(w.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 14px',
                background: '#fff',
                border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Checkbox */}
              <span style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: checked ? 'var(--color-primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s, border-color 0.12s',
              }}>
                {checked && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>{w.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{w.description}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const arrowBtn = (disabled: boolean): React.CSSProperties => ({
  width: 30, height: 30,
  border: `1px solid ${disabled ? 'var(--color-border-light)' : 'var(--color-border)'}`,
  borderRadius: 6,
  background: 'var(--color-bg)',
  color: disabled ? 'var(--color-border)' : 'var(--color-text-secondary)',
  fontSize: 14, cursor: disabled ? 'default' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
  WebkitTapHighlightColor: 'transparent',
})
