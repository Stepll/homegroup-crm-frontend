import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, SpinLoading, Toast } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import { usePermission } from '@/hooks/usePermission'
import type { Person, PersonActivity } from '@/types'

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateKey(iso: string) {
  return iso.slice(0, 10)
}

function fmtDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (sameDay(d, today)) return 'Сьогодні'
  if (sameDay(d, yesterday)) return 'Вчора'
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

// ── DateSeparator ─────────────────────────────────────────────────────────────

function DateSeparator({ iso }: { iso: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
      <div style={{
        background: 'rgba(0,0,0,0.07)', borderRadius: 12,
        padding: '3px 14px', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500,
      }}>{fmtDateLabel(iso)}</div>
    </div>
  )
}

// ── StatusTag ─────────────────────────────────────────────────────────────────

function StatusTag({ name, color }: { name: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '1px 8px', borderRadius: 20,
      background: color + '22', color, fontWeight: 600, fontSize: 12,
    }}>{name}</span>
  )
}

// ── SystemMessage ─────────────────────────────────────────────────────────────

function SystemMessage({ entry }: { entry: PersonActivity }) {
  let content: React.ReactNode

  if (entry.type === 'status_change') {
    const { oldStatus, newStatus } = entry
    if (!oldStatus && newStatus) {
      content = <span>Статус встановлено: <StatusTag name={newStatus.name} color={newStatus.color} /></span>
    } else if (oldStatus && !newStatus) {
      content = <span>Статус знято: <StatusTag name={oldStatus.name} color={oldStatus.color} /></span>
    } else if (oldStatus && newStatus) {
      content = <span><StatusTag name={oldStatus.name} color={oldStatus.color} />{' → '}<StatusTag name={newStatus.name} color={newStatus.color} /></span>
    } else {
      content = <span>Статус змінено</span>
    }
  } else if (entry.type === 'oversight_change') {
    const { oldValue, newValue } = entry
    if (!oldValue && newValue) {
      content = <span>Опікун призначений: <b>{newValue}</b></span>
    } else if (oldValue && !newValue) {
      content = <span>Опікун знятий: <b>{oldValue}</b></span>
    } else {
      content = <span>Опікун змінений: <b>{oldValue}</b>{' → '}<b>{newValue}</b></span>
    }
  } else {
    content = <span>Зміна</span>
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
      <div style={{
        background: 'rgba(0,0,0,0.06)', borderRadius: 12,
        padding: '4px 12px', fontSize: 12, color: 'var(--color-text-secondary)',
        textAlign: 'center', maxWidth: '84%',
      }}>
        {content}
        {entry.authorName && <span style={{ color: 'var(--color-text-tertiary)' }}> · {entry.authorName}</span>}
        <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{fmtTime(entry.createdAt)}</span>
      </div>
    </div>
  )
}

// ── ContextMenu ───────────────────────────────────────────────────────────────

interface ContextMenuState {
  entryId: number
  x: number
  y: number
}

function ContextMenu({ menu, onDelete, onClose }: {
  menu: ContextMenuState
  onDelete: (id: number) => void
  onClose: () => void
}) {
  const menuW = 140
  const menuH = 44
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x = Math.min(menu.x, vw - menuW - 8)
  const y = menu.y + menuH > vh ? menu.y - menuH - 8 : menu.y + 8

  return (
    <>
      {/* Backdrop — captures outside taps without letting them fall through */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        onPointerDown={onClose}
      />
      <div
        style={{
          position: 'fixed', left: x, top: y, zIndex: 1000,
          background: '#fff', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          overflow: 'hidden', minWidth: menuW,
        }}
      >
        <button
          onTouchEnd={(e) => { e.preventDefault(); onDelete(menu.entryId) }}
          onClick={(e) => { e.stopPropagation(); onDelete(menu.entryId) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '10px 16px', border: 'none',
            background: 'none', cursor: 'pointer', color: 'var(--color-error)',
            fontSize: 14, fontWeight: 500, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          Видалити
        </button>
      </div>
    </>
  )
}

// ── CommentBubble ─────────────────────────────────────────────────────────────

function CommentBubble({ entry, canEdit, onLongPress }: {
  entry: PersonActivity
  canEdit: boolean
  onLongPress: (id: number, x: number, y: number) => void
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canEdit) return
    const touch = e.touches[0]
    pressTimer.current = setTimeout(() => {
      onLongPress(entry.id, touch.clientX, touch.clientY)
    }, 400)
  }

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!canEdit) return
    onLongPress(entry.id, e.clientX, e.clientY)
  }

  return (
    <div
      style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onClick={handleClick}
    >
      <div style={{ maxWidth: '75%' }}>
        {entry.authorName && (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginBottom: 2, paddingRight: 4 }}>
            {entry.authorName}
          </div>
        )}
        <div style={{
          background: 'var(--color-primary)', color: '#fff',
          borderRadius: '16px 16px 4px 16px',
          padding: '8px 12px', fontSize: 14, lineHeight: 1.45,
          wordBreak: 'break-word', userSelect: 'none',
        }}>
          {entry.content}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 2, paddingRight: 4 }}>
          {fmtTime(entry.createdAt)}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PersonActivityPageMobile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const personId = Number(id)
  const canEdit = usePermission('people.edit')

  const [person, setPerson] = useState<Person | null>(null)
  const [entries, setEntries] = useState<PersonActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const menuJustClosedRef = useRef(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    Promise.all([
      peopleApi.getById(personId),
      peopleApi.getActivity(personId),
    ])
      .then(([p, a]) => {
        setPerson(p)
        setEntries([...a].reverse())
      })
      .catch(() => Toast.show({ content: 'Помилка завантаження', icon: 'fail' }))
      .finally(() => setLoading(false))
  }, [personId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [entries])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const entry = await peopleApi.addComment(personId, text.trim())
      setEntries((prev) => [...prev, entry])
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      Toast.show({ content: 'Помилка відправки', icon: 'fail' })
    } finally {
      setSending(false)
    }
  }

  const closeMenu = () => {
    setContextMenu(null)
    menuJustClosedRef.current = true
    setTimeout(() => { menuJustClosedRef.current = false }, 400)
  }

  const handleDelete = async (entryId: number) => {
    closeMenu()
    try {
      await peopleApi.deleteActivity(personId, entryId)
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
    } catch {
      Toast.show({ content: 'Помилка видалення', icon: 'fail' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const fullName = person ? [person.name, person.lastName].filter(Boolean).join(' ') : ''

  // Insert date separators
  const renderedItems: React.ReactNode[] = []
  let lastDateKey = ''
  for (const entry of entries) {
    const dk = toDateKey(entry.createdAt)
    if (dk !== lastDateKey) {
      renderedItems.push(<DateSeparator key={`date-${dk}`} iso={entry.createdAt} />)
      lastDateKey = dk
    }
    if (entry.type === 'comment') {
      renderedItems.push(
        <CommentBubble
          key={entry.id}
          entry={entry}
          canEdit={canEdit}
          onLongPress={(id, x, y) => {
            if (menuJustClosedRef.current) return
            setContextMenu({ entryId: id, x, y })
          }}
        />
      )
    } else {
      renderedItems.push(<SystemMessage key={entry.id} entry={entry} />)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
      <NavBar onBack={() => navigate(-1)}>
        {fullName || 'Активність'}
      </NavBar>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 8px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <SpinLoading color="primary" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, paddingTop: 60 }}>
            Немає записів
          </div>
        )}

        {renderedItems}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canEdit && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          background: '#fff',
          padding: '8px 12px',
          display: 'flex', alignItems: 'flex-end', gap: 8,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Написати коментар..."
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1.5px solid var(--color-border)',
              borderRadius: 20, padding: '8px 14px', fontSize: 15,
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.45,
              background: 'var(--color-bg)', color: 'var(--color-text)',
              maxHeight: 120, overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: text.trim() ? 'var(--color-primary)' : 'var(--color-border)',
              color: '#fff', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onDelete={handleDelete}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
