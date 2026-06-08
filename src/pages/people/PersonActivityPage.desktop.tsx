import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Typography, Space, Spin, Modal } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { peopleApi } from '@/api/people'
import { usePermission } from '@/hooks/usePermission'
import type { Person, PersonActivity } from '@/types'

const { Title } = Typography

function toDateKey(iso: string) { return iso.slice(0, 10) }

function fmtDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'Сьогодні'
  if (sameDay(d, yesterday)) return 'Вчора'
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

function StatusTag({ name, color }: { name: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 20, background: color + '22', color, fontWeight: 600, fontSize: 12 }}>
      {name}
    </span>
  )
}

function SystemMessage({ entry }: { entry: PersonActivity }) {
  let content: React.ReactNode
  if (entry.type === 'status_change') {
    const { oldStatus, newStatus } = entry
    if (!oldStatus && newStatus) content = <span>Статус встановлено: <StatusTag name={newStatus.name} color={newStatus.color} /></span>
    else if (oldStatus && !newStatus) content = <span>Статус знято: <StatusTag name={oldStatus.name} color={oldStatus.color} /></span>
    else if (oldStatus && newStatus) content = <span><StatusTag name={oldStatus.name} color={oldStatus.color} />{' → '}<StatusTag name={newStatus.name} color={newStatus.color} /></span>
    else content = <span>Статус змінено</span>
  } else if (entry.type === 'oversight_change') {
    const { oldValue, newValue } = entry
    if (!oldValue && newValue) content = <span>Опікун призначений: <b>{newValue}</b></span>
    else if (oldValue && !newValue) content = <span>Опікун знятий: <b>{oldValue}</b></span>
    else content = <span>Опікун змінений: <b>{oldValue}</b>{' → '}<b>{newValue}</b></span>
  } else {
    content = <span>Зміна</span>
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
      <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 12, padding: '4px 12px', fontSize: 12, color: 'rgba(0,0,0,0.55)', textAlign: 'center' }}>
        {content}
        {entry.authorName && <span style={{ color: 'rgba(0,0,0,0.35)' }}> · {entry.authorName}</span>}
        <span style={{ color: 'rgba(0,0,0,0.35)', marginLeft: 4 }}>{fmtTime(entry.createdAt)}</span>
      </div>
    </div>
  )
}

export function PersonActivityPageDesktop() {
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
    Promise.all([peopleApi.getById(personId), peopleApi.getActivity(personId)])
      .then(([p, a]) => { setPerson(p); setEntries([...a].reverse()) })
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
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (entryId: number) => {
    Modal.confirm({
      title: 'Видалити коментар?',
      okText: 'Видалити', okType: 'danger', cancelText: 'Скасувати',
      onOk: async () => {
        await peopleApi.deleteActivity(personId, entryId)
        setEntries((prev) => prev.filter((e) => e.id !== entryId))
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const fullName = person ? [person.name, person.lastName].filter(Boolean).join(' ') : ''

  const renderedItems: React.ReactNode[] = []
  let lastDateKey = ''
  for (const entry of entries) {
    const dk = toDateKey(entry.createdAt)
    if (dk !== lastDateKey) {
      renderedItems.push(
        <div key={`date-${dk}`} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
          <div style={{ background: 'rgba(0,0,0,0.07)', borderRadius: 12, padding: '3px 14px', fontSize: 12, color: 'rgba(0,0,0,0.55)', fontWeight: 500 }}>
            {fmtDateLabel(entry.createdAt)}
          </div>
        </div>
      )
      lastDateKey = dk
    }
    if (entry.type === 'comment') {
      renderedItems.push(
        <div key={entry.id} style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0' }}>
          <div style={{ maxWidth: '70%' }}>
            {entry.authorName && (
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textAlign: 'right', marginBottom: 2, paddingRight: 4 }}>
                {entry.authorName}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {canEdit && (
                <button
                  onClick={() => handleDelete(entry.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(0,0,0,0.2)', fontSize: 12, display: 'flex', alignItems: 'center' }}
                >
                  <DeleteOutlined />
                </button>
              )}
              <div style={{ background: '#2AAFCA', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '8px 12px', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word' }}>
                {entry.content}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', textAlign: 'right', marginTop: 2, paddingRight: 4 }}>
              {fmtTime(entry.createdAt)}
            </div>
          </div>
        </div>
      )
    } else {
      renderedItems.push(<SystemMessage key={entry.id} entry={entry} />)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', padding: '0 0 0 0' }}>
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Назад</Button>
          <Title level={4} style={{ margin: 0 }}>{fullName || 'Активність'}</Title>
        </Space>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
        {loading && <div style={{ textAlign: 'center', paddingTop: 40 }}><Spin /></div>}
        {!loading && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.35)', fontSize: 14, paddingTop: 60 }}>Немає записів</div>
        )}
        {renderedItems}
        <div ref={bottomRef} />
      </div>

      {canEdit && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Написати коментар... (Enter — відправити, Shift+Enter — новий рядок)"
            rows={1}
            style={{
              flex: 1, resize: 'none', border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 20, padding: '8px 14px', fontSize: 14,
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.45,
              background: '#f9fafb', color: 'rgba(0,0,0,0.85)',
              maxHeight: 120, overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: text.trim() ? '#2AAFCA' : 'rgba(0,0,0,0.12)',
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
