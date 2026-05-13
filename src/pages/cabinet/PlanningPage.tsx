import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { NavBar, Button, Input, Popup, List, Toast, SpinLoading, Dialog } from 'antd-mobile'
import { AddOutline, DeleteOutline, UpOutline, DownOutline, EditSOutline, CheckOutline } from 'antd-mobile-icons'
import { planningApi } from '@/api/planning'
import { groupsApi } from '@/api/groups'
import type { PlanBlock, PlanTemplate, MeetingPlanSummary } from '@/types'

type OrgMember = { id: number; name: string }

// ── Block card — view + edit modes ────────────────────────────────────────────

function BlockCard({ block, index, total, orgTeam, defaultEditing, onChange, onDelete, onMove }: {
  block: PlanBlock
  index: number
  total: number
  orgTeam: OrgMember[]
  defaultEditing?: boolean
  onChange: (patch: Partial<PlanBlock>) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(defaultEditing ?? false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const orgMember = orgTeam.find((m) => m.name === block.responsible)
  const filtered = orgTeam.filter((m) =>
    !block.responsible || m.name.toLowerCase().includes(block.responsible.toLowerCase())
  )

  if (!editing) {
    return (
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-tertiary)', minWidth: 38, paddingTop: 2, flexShrink: 0 }}>
            {block.time || '—:—'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: block.title ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
              {block.title || 'Назва'}
            </div>
            {block.info && (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{block.info}</div>
            )}
            {block.responsible && (
              <div style={{ marginTop: 3 }}>
                {orgMember ? (
                  <button
                    onClick={() => navigate(`/settings/admins/${orgMember.id}`)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--color-primary)', textDecoration: 'underline' }}>
                    {block.responsible}
                  </button>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{block.responsible}</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} style={iconBtn}><EditSOutline /></button>
            <button onClick={onDelete} style={{ ...iconBtn, color: 'var(--color-error)' }}><DeleteOutline /></button>
          </div>
        </div>
      </div>
    )
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '12px 14px', border: '1.5px solid var(--color-primary)' }}>
      {/* Time + Title */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <input
          type="time"
          value={block.time}
          onChange={(e) => onChange({ time: e.target.value })}
          style={{
            width: 100, flexShrink: 0,
            border: '1.5px solid var(--color-border)', borderRadius: 8,
            padding: '8px 6px', fontSize: 14,
            background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none',
          }}
        />
        <div style={{ ...inputWrap, flex: 1, minWidth: 0 }}>
          <Input value={block.title} onChange={(v) => onChange({ title: v })} placeholder="Назва блоку" />
        </div>
      </div>

      {/* Info */}
      <div style={{ ...inputWrap, marginBottom: 8 }}>
        <Input value={block.info} onChange={(v) => onChange({ info: v })} placeholder="Додаткова інформація" />
      </div>

      {/* Responsible */}
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <div style={inputWrap}>
          <Input
            value={block.responsible}
            onChange={(v) => onChange({ responsible: v })}
            placeholder="Відповідальний"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
        </div>
        {showSuggestions && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: '#fff', border: '1px solid var(--color-border)',
            borderRadius: 8, boxShadow: 'var(--shadow-sm)', marginTop: 2,
          }}>
            {filtered.map((m) => (
              <button
                key={m.id}
                onMouseDown={() => onChange({ responsible: m.name })}
                style={{
                  display: 'block', width: '100%', padding: '9px 12px',
                  textAlign: 'left', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--color-border-light)',
                  cursor: 'pointer', fontSize: 14, color: 'var(--color-text)',
                }}>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions: move + done + delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onMove(-1)} disabled={index === 0} style={{ ...iconBtn, opacity: index === 0 ? 0.3 : 1 }}><UpOutline /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} style={{ ...iconBtn, opacity: index === total - 1 ? 0.3 : 1 }}><DownOutline /></button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setEditing(false)} style={{ ...iconBtn, color: 'var(--color-primary)', fontSize: 20 }}><CheckOutline /></button>
          <button onClick={onDelete} style={{ ...iconBtn, color: 'var(--color-error)' }}><DeleteOutline /></button>
        </div>
      </div>
    </div>
  )
}

// ── Past plans drawer ─────────────────────────────────────────────────────────

function PastPlansDrawer({ groupId, visible, onClose }: { groupId: number; visible: boolean; onClose: () => void }) {
  const [plans, setPlans] = useState<MeetingPlanSummary[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detailBlocks, setDetailBlocks] = useState<Record<number, PlanBlock[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    planningApi.getPlans(groupId).then(setPlans).finally(() => setLoading(false))
  }, [visible, groupId])

  const expand = async (plan: MeetingPlanSummary) => {
    if (expanded === plan.id) { setExpanded(null); return }
    setExpanded(plan.id)
    if (!detailBlocks[plan.id]) {
      const detail = await planningApi.getPlan(groupId, plan.meetingDate)
      if (detail) setDetailBlocks((prev) => ({ ...prev, [plan.id]: detail.blocks }))
    }
  }

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).replace(' р.', '')

  return (
    <Popup visible={visible} onMaskClick={onClose} position="bottom"
      bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '75vh', overflow: 'auto' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>Минулі плани</span>
        <Button size="mini" fill="none" onClick={onClose}>Закрити</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><SpinLoading color="primary" /></div>
      ) : plans.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>Збережених планів ще немає</div>
      ) : (
        <div style={{ paddingBottom: 24 }}>
          {plans.map((p) => (
            <div key={p.id}>
              <button
                onClick={() => expand(p)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(p.meetingDate)}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {p.blockCount} блоків{p.appliedTemplateName ? ` · ${p.appliedTemplateName}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{expanded === p.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === p.id && detailBlocks[p.id] && (
                <div style={{ padding: '8px 16px 12px', background: 'var(--color-bg)' }}>
                  {detailBlocks[p.id].map((b, i) => (
                    <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--color-text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-text)', marginRight: 6 }}>{b.time}</span>
                      {b.title}
                      {b.info && <span style={{ color: 'var(--color-text-tertiary)' }}> · {b.info}</span>}
                      {b.responsible && <span style={{ color: 'var(--color-primary)' }}> · {b.responsible}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Popup>
  )
}

// ── Planning page ─────────────────────────────────────────────────────────────

export function PlanningPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const groupId = Number(id)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const [blocks, setBlocks] = useState<PlanBlock[]>([])
  const [newBlockKeys, setNewBlockKeys] = useState<number[]>([])
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null)
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [orgTeam, setOrgTeam] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templatePopupVisible, setTemplatePopupVisible] = useState(false)
  const [pastPlansVisible, setPastPlansVisible] = useState(false)
  const [saveTemplateVisible, setSaveTemplateVisible] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    Promise.all([
      planningApi.getPlan(groupId, date),
      planningApi.getTemplates(),
      groupsApi.getCabinet(groupId),
    ]).then(([plan, tmplts, cabinet]) => {
      setTemplates(tmplts)
      setOrgTeam(cabinet.orgTeam.map((m) => ({
        id: m.id,
        name: [m.name, m.lastName].filter(Boolean).join(' '),
      })))
      if (plan) {
        setBlocks(plan.blocks.map((b) => ({ ...b, info: b.info ?? '', responsible: b.responsible ?? '' })))
        setAppliedTemplateName(plan.appliedTemplateName ?? null)
      }
    }).finally(() => setLoading(false))
  }, [groupId, date])

  const applyTemplate = (t: PlanTemplate) => {
    setBlocks(t.blocks.map((b, i) => ({ order: i, time: b.time, title: b.title, info: b.info ?? '', responsible: b.responsible ?? '' })))
    setNewBlockKeys([])
    setAppliedTemplateName(t.name)
    setTemplatePopupVisible(false)
  }

  const addBlock = () => {
    const newIndex = blocks.length
    setBlocks((prev) => [...prev, { order: newIndex, time: '', title: '', info: '', responsible: '' }])
    setNewBlockKeys((prev) => [...prev, newIndex])
  }

  const updateBlock = (i: number, patch: Partial<PlanBlock>) => {
    setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  }

  const deleteBlock = (i: number) => {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i).map((b, idx) => ({ ...b, order: idx })))
    setNewBlockKeys((prev) => prev.filter((k) => k !== i).map((k) => k > i ? k - 1 : k))
  }

  const moveBlock = (i: number, dir: -1 | 1) => {
    const next = [...blocks]
    const target = i + dir
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]
    setBlocks(next.map((b, idx) => ({ ...b, order: idx })))
  }

  const save = async () => {
    setSaving(true)
    try {
      await planningApi.savePlan(groupId, {
        meetingDate: date,
        appliedTemplateName,
        blocks: blocks.map((b, i) => ({
          order: i, time: b.time, title: b.title,
          info: (b.info || null) as unknown as string,
          responsible: (b.responsible || null) as unknown as string,
        })),
      })
      setNewBlockKeys([])
      Toast.show({ content: 'Збережено!', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка збереження', icon: 'fail' })
    }
    setSaving(false)
  }

  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) return
    setSavingTemplate(true)
    try {
      const t = await planningApi.createTemplate({
        name: newTemplateName.trim(),
        blocks: blocks.map((b, i) => ({
          order: i, time: b.time, title: b.title,
          info: (b.info || null) as unknown as string,
          responsible: (b.responsible || null) as unknown as string,
        })),
      })
      setTemplates((prev) => [t, ...prev])
      setSaveTemplateVisible(false)
      setNewTemplateName('')
      Toast.show({ content: 'Шаблон збережено!', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка', icon: 'fail' })
    }
    setSavingTemplate(false)
  }

  const deleteTemplate = async (t: PlanTemplate) => {
    const ok = await Dialog.confirm({ title: `Видалити шаблон "${t.name}"?`, confirmText: 'Видалити', cancelText: 'Скасувати' })
    if (!ok) return
    await planningApi.deleteTemplate(t.id)
    setTemplates((prev) => prev.filter((x) => x.id !== t.id))
  }

  // "пт, 15 травня 2026" — no "р." suffix
  const fmtHeader = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    const wd = d.toLocaleDateString('uk-UA', { weekday: 'short' })
    const dm = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
    return `${wd}, ${dm} ${d.getFullYear()}`
  }

  if (loading) return (
    <div>
      <NavBar onBack={() => navigate(`/cabinet/${groupId}`)}>Планування</NavBar>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}><SpinLoading color="primary" /></div>
    </div>
  )

  return (
    <div style={{ paddingBottom: 100 }}>
      <NavBar onBack={() => navigate(`/cabinet/${groupId}`)}>Планування</NavBar>

      {/* Header: date + template tag + buttons */}
      <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            {fmtHeader(date)}
          </span>
          <div style={{ flex: 1 }} />
          {blocks.length > 0 && (
            <button
              onClick={() => { setNewTemplateName(''); setSaveTemplateVisible(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', padding: '4px 0' }}>
              Зберегти шаблон
            </button>
          )}
          <Button size="small" fill="outline"
            style={{ '--border-color': 'var(--color-primary)', '--text-color': 'var(--color-primary)', flexShrink: 0 } as React.CSSProperties}
            onClick={() => setTemplatePopupVisible(true)}>
            Шаблон
          </Button>
        </div>
      </div>

      {/* Blocks */}
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, padding: '24px 0' }}>
            Додайте перший блок або застосуйте шаблон
          </div>
        )}
        {blocks.map((block, i) => (
          <BlockCard
            key={i}
            block={block}
            index={i}
            total={blocks.length}
            orgTeam={orgTeam}
            defaultEditing={newBlockKeys.includes(i)}
            onChange={(patch) => updateBlock(i, patch)}
            onDelete={() => deleteBlock(i)}
            onMove={(dir) => moveBlock(i, dir)}
          />
        ))}

        <button onClick={addBlock} style={addBlockBtn}>
          <AddOutline style={{ fontSize: 16 }} />
          <span>Додати блок</span>
        </button>
      </div>

      {/* Past plans link */}
      <div style={{ padding: '4px 16px 20px', textAlign: 'center' }}>
        <button
          onClick={() => setPastPlansVisible(true)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer' }}>
          Подивитись минулі плани →
        </button>
      </div>

      {/* Template selector */}
      <Popup visible={templatePopupVisible} onMaskClick={() => setTemplatePopupVisible(false)}
        bodyStyle={{ borderRadius: '16px 16px 0 0', maxHeight: '70vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Застосувати шаблон</span>
          <Button size="mini" fill="none" onClick={() => setTemplatePopupVisible(false)}>Закрити</Button>
        </div>
        {templates.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Шаблонів ще немає. Збережіть поточний план як шаблон.
          </div>
        ) : (
          <List style={{ marginBottom: 16 }}>
            {templates.map((t) => (
              <List.Item
                key={t.id}
                description={`${t.blocks.length} блоків`}
                extra={
                  <button onClick={(e) => { e.stopPropagation(); deleteTemplate(t) }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 18, cursor: 'pointer', padding: 4 }}>
                    <DeleteOutline />
                  </button>
                }
                onClick={() => applyTemplate(t)}
                arrow>
                {t.name}
              </List.Item>
            ))}
          </List>
        )}
      </Popup>

      {/* Save as template */}
      <Popup visible={saveTemplateVisible} onMaskClick={() => setSaveTemplateVisible(false)}
        bodyStyle={{ padding: 24, borderRadius: '16px 16px 0 0' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Зберегти як шаблон</div>
        <div style={inputWrap}>
          <Input value={newTemplateName} onChange={setNewTemplateName} placeholder="Назва шаблону" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button block loading={savingTemplate} onClick={saveAsTemplate}
            style={{ '--background-color': 'var(--color-primary)', '--text-color': '#fff', '--border-color': 'var(--color-primary)' } as React.CSSProperties}>
            Зберегти
          </Button>
          <Button block fill="outline" onClick={() => setSaveTemplateVisible(false)}>Скасувати</Button>
        </div>
      </Popup>

      {/* Past plans */}
      <PastPlansDrawer groupId={groupId} visible={pastPlansVisible} onClose={() => setPastPlansVisible(false)} />

      {/* Fixed save button */}
      <div style={{
        position: 'fixed', bottom: 'calc(58px + env(safe-area-inset-bottom))', left: 0, right: 0,
        padding: '12px 16px', background: '#fff',
        boxShadow: '0 -1px 0 var(--color-border-light), 0 -4px 12px rgba(0,0,0,0.06)',
      }}>
        <Button block color="primary" size="large" loading={saving} onClick={save}>
          Зберегти план
        </Button>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputWrap: React.CSSProperties = {
  background: '#F9FAFB', borderRadius: 8,
  border: '1.5px solid var(--color-border)', padding: '7px 12px',
}
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 6,
  cursor: 'pointer', color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center', fontSize: 16, borderRadius: 6,
}
const addBlockBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  width: '100%', padding: '14px 0',
  background: '#fff', border: '1.5px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)', cursor: 'pointer',
  fontSize: 14, fontWeight: 600, color: 'var(--color-primary)',
  WebkitTapHighlightColor: 'transparent',
}
