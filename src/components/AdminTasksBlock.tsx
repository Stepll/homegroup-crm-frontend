import { useEffect, useState } from 'react'
import { Input, Popup, Button, Toast, Dialog } from 'antd-mobile'
import { AddOutline, EditSOutline, DeleteOutline, CheckOutline } from 'antd-mobile-icons'
import { adminsApi } from '@/api/admins'
import type { AdminTask } from '@/types'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  adminId: number
}

export function AdminTasksBlock({ adminId }: Props) {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)

  const [addVisible, setAddVisible] = useState(false)
  const [editTask, setEditTask] = useState<AdminTask | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminsApi.getTasks(adminId)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adminId])

  const openAdd = () => {
    setDraftTitle('')
    setDraftDesc('')
    setAddVisible(true)
  }

  const openEdit = (task: AdminTask) => {
    setEditTask(task)
    setDraftTitle(task.title)
    setDraftDesc(task.description ?? '')
  }

  const handleSaveAdd = async () => {
    if (!draftTitle.trim()) { Toast.show({ content: "Назва обов'язкова", icon: 'fail' }); return }
    setSaving(true)
    try {
      const t = await adminsApi.createTask(adminId, draftTitle.trim(), draftDesc.trim() || undefined)
      setTasks((prev) => [t, ...prev])
      setAddVisible(false)
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setSaving(false)
  }

  const handleSaveEdit = async () => {
    if (!editTask || !draftTitle.trim()) { Toast.show({ content: "Назва обов'язкова", icon: 'fail' }); return }
    setSaving(true)
    try {
      const t = await adminsApi.updateTask(adminId, editTask.id, draftTitle.trim(), draftDesc.trim() || undefined)
      setTasks((prev) => prev.map((x) => x.id === t.id ? t : x))
      setEditTask(null)
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
    setSaving(false)
  }

  const handleToggle = async (task: AdminTask) => {
    try {
      const t = await adminsApi.toggleTask(adminId, task.id)
      setTasks((prev) => prev.map((x) => x.id === t.id ? t : x))
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
  }

  const handleDelete = async (task: AdminTask) => {
    const ok = await Dialog.confirm({ title: `Видалити "${task.title}"?`, confirmText: 'Видалити', cancelText: 'Скасувати' })
    if (!ok) return
    try {
      await adminsApi.deleteTask(adminId, task.id)
      setTasks((prev) => prev.filter((x) => x.id !== task.id))
    } catch { Toast.show({ content: 'Помилка', icon: 'fail' }) }
  }

  return (
    <>
      <div style={block}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={blockLabel}>Задачі</span>
            {tasks.filter((t) => !t.isCompleted).length > 0 && (
              <span style={{
                background: 'var(--color-error)', color: '#fff',
                borderRadius: '50%', minWidth: 18, height: 18,
                fontSize: 11, fontWeight: 700, lineHeight: '18px',
                textAlign: 'center', padding: '0 4px',
              }}>
                {tasks.filter((t) => !t.isCompleted).length}
              </span>
            )}
          </div>
          <button onClick={openAdd} style={{ ...iconBtn, color: 'var(--color-primary)' }}>
            <AddOutline style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* List */}
        {loading ? null : tasks.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Немає задач</span>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map((task) => (
              <div key={task.id} style={{
                background: task.isCompleted ? '#F3F4F6' : '#fff',
                border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '10px 12px',
                opacity: task.isCompleted ? 0.72 : 1,
                transition: 'opacity 0.2s',
              }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: 600,
                    textDecoration: task.isCompleted ? 'line-through' : 'none',
                    color: task.isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text)',
                  }}>{task.title}</span>

                  {/* Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggle(task)}
                      title={task.isCompleted ? 'Відновити' : 'Виконано'}
                      style={{
                        ...iconBtn, padding: 4,
                        color: task.isCompleted ? 'var(--color-text-tertiary)' : 'var(--color-success)',
                      }}>
                      <CheckOutline style={{ fontSize: 16 }} />
                    </button>
                    <button onClick={() => openEdit(task)} style={{ ...iconBtn, padding: 4, color: 'var(--color-primary)' }}>
                      <EditSOutline style={{ fontSize: 16 }} />
                    </button>
                    <button onClick={() => handleDelete(task)} style={{ ...iconBtn, padding: 4, color: 'var(--color-error)' }}>
                      <DeleteOutline style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                    {task.description}
                  </div>
                )}

                {/* Meta */}
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                  {task.createdByName && <span>{task.createdByName} · </span>}
                  <span>{fmtDate(task.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add popup */}
      <Popup visible={addVisible} onMaskClick={() => setAddVisible(false)}
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '20px 16px 36px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Нова задача</div>
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Назва</div>
          <div style={inputWrap}><Input value={draftTitle} onChange={setDraftTitle} placeholder="Назва задачі" autoFocus /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Опис</div>
          <textarea
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="Опис (необов'язково)"
            rows={3}
            style={{ ...inputWrap, width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: 15, outline: 'none', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button block loading={saving} onClick={handleSaveAdd}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Додати
          </Button>
          <Button block fill="outline" onClick={() => setAddVisible(false)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Edit popup */}
      <Popup visible={!!editTask} onMaskClick={() => setEditTask(null)}
        bodyStyle={{ borderRadius: '16px 16px 0 0', padding: '20px 16px 36px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Редагувати задачу</div>
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Назва</div>
          <div style={inputWrap}><Input value={draftTitle} onChange={setDraftTitle} placeholder="Назва задачі" /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Опис</div>
          <textarea
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            placeholder="Опис (необов'язково)"
            rows={3}
            style={{ ...inputWrap, width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: 15, outline: 'none', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button block loading={saving} onClick={handleSaveEdit}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Зберегти
          </Button>
          <Button block fill="outline" onClick={() => setEditTask(null)}>Скасувати</Button>
        </div>
      </Popup>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const block: React.CSSProperties = {
  background: '#fff', borderRadius: 'var(--radius-lg)',
  padding: '14px 16px', marginTop: 16, boxShadow: 'var(--shadow-sm)',
}
const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)', padding: '8px 12px',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', fontSize: 16,
  WebkitTapHighlightColor: 'transparent',
}
const blockLabel: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const fieldLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 6,
}
