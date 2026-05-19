import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavBar, SpinLoading, Toast } from 'antd-mobile'
import { peopleApi } from '@/api/people'
import { usePermission } from '@/hooks/usePermission'
import type { Person, PersonActivity } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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
  const { oldStatus, newStatus, authorName, createdAt } = entry

  let content: React.ReactNode
  if (!oldStatus && newStatus) {
    content = <span>Статус встановлено: <StatusTag name={newStatus.name} color={newStatus.color} /></span>
  } else if (oldStatus && !newStatus) {
    content = <span>Статус знято: <StatusTag name={oldStatus.name} color={oldStatus.color} /></span>
  } else if (oldStatus && newStatus) {
    content = (
      <span>
        <StatusTag name={oldStatus.name} color={oldStatus.color} />
        {' → '}
        <StatusTag name={newStatus.name} color={newStatus.color} />
      </span>
    )
  } else {
    content = <span>Статус змінено</span>
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
      <div style={{
        background: 'rgba(0,0,0,0.06)', borderRadius: 12,
        padding: '4px 12px', fontSize: 12, color: 'var(--color-text-secondary)',
        textAlign: 'center', maxWidth: '80%',
      }}>
        {content}
        {authorName && <span style={{ color: 'var(--color-text-tertiary)' }}> · {authorName}</span>}
        <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{fmtTime(createdAt)}</span>
      </div>
    </div>
  )
}

// ── CommentBubble ─────────────────────────────────────────────────────────────

function CommentBubble({ entry }: { entry: PersonActivity }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0' }}>
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
          wordBreak: 'break-word',
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

export function PersonActivityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const personId = Number(id)
  const canEdit = usePermission('people.edit')

  const [person, setPerson] = useState<Person | null>(null)
  const [entries, setEntries] = useState<PersonActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    Promise.all([
      peopleApi.getById(personId),
      peopleApi.getActivity(personId),
    ])
      .then(([p, a]) => {
        setPerson(p)
        setEntries([...a].reverse()) // API returns desc, we display asc (oldest first)
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

  const fullName = person ? [person.name, person.lastName].filter(Boolean).join(' ') : 'Людина'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg)' }}>
      <NavBar onBack={() => navigate(`/people/${personId}`)}>
        {loading ? 'Активність' : fullName}
      </NavBar>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
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

        {entries.map((entry) =>
          entry.type === 'status_change'
            ? <SystemMessage key={entry.id} entry={entry} />
            : <CommentBubble key={entry.id} entry={entry} />
        )}
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
    </div>
  )
}
