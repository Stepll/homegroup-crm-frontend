import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Input, Typography, Space, Card, Modal, AutoComplete, Spin } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined, EditOutlined, CheckOutlined, SaveOutlined } from '@ant-design/icons'
import { planningApi } from '@/api/planning'
import { groupsApi } from '@/api/groups'
import type { PlanBlock, PlanTemplate, MeetingPlanSummary } from '@/types'

const { Title, Text } = Typography

type OrgMember = { id: number; name: string }

// ── Block card ────────────────────────────────────────────────────────────────

function BlockCard({ block, index, total, orgTeam, defaultEditing, onChange, onDelete, onMove }: {
  block: PlanBlock; index: number; total: number; orgTeam: OrgMember[]
  defaultEditing?: boolean
  onChange: (patch: Partial<PlanBlock>) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(defaultEditing ?? false)
  const orgMember = orgTeam.find((m) => m.name === block.responsible)
  const filtered = orgTeam.filter((m) => !block.responsible || m.name.toLowerCase().includes(block.responsible.toLowerCase()))

  if (!editing) {
    return (
      <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.45)', minWidth: 42, paddingTop: 2, flexShrink: 0 }}>
            {block.time || '—:—'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ color: block.title ? undefined : 'rgba(0,0,0,0.35)' }}>{block.title || 'Назва'}</Text>
            {block.info && <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>{block.info}</Text>}
            {block.responsible && (
              <div style={{ marginTop: 3 }}>
                {orgMember ? (
                  <button onClick={() => navigate(`/settings/admins/${orgMember.id}`)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: '#2AAFCA', textDecoration: 'underline' }}>
                    {block.responsible}
                  </button>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>{block.responsible}</Text>
                )}
              </div>
            )}
          </div>
          <Space>
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditing(true)} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onDelete} />
          </Space>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1.5px solid #2AAFCA' }}>
      <Space style={{ width: '100%', marginBottom: 8 }} direction="vertical" size={8}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            type="time" value={block.time}
            onChange={(e) => onChange({ time: e.target.value })}
            style={{ width: 120, flexShrink: 0 }}
          />
          <Input
            value={block.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Назва блоку"
            style={{ flex: 1 }}
          />
        </div>
        <Input
          value={block.info}
          onChange={(e) => onChange({ info: e.target.value })}
          placeholder="Додаткова інформація"
        />
        <AutoComplete
          value={block.responsible || undefined}
          onChange={(v) => onChange({ responsible: v ?? '' })}
          options={filtered.map((m) => ({ label: m.name, value: m.name }))}
          placeholder="Відповідальний"
          style={{ width: '100%' }}
          allowClear
        />
      </Space>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button size="small" icon={<UpOutlined />} disabled={index === 0} onClick={() => onMove(-1)} />
          <Button size="small" icon={<DownOutlined />} disabled={index === total - 1} onClick={() => onMove(1)} />
        </Space>
        <Space>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setEditing(false)}>Готово</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
        </Space>
      </div>
    </div>
  )
}

// ── Past plans panel ──────────────────────────────────────────────────────────

function PastPlansPanel({ groupId }: { groupId: number }) {
  const [plans, setPlans] = useState<MeetingPlanSummary[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detailBlocks, setDetailBlocks] = useState<Record<number, PlanBlock[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    planningApi.getPlans(groupId).then(setPlans).finally(() => setLoading(false))
  }, [groupId])

  const expand = async (plan: MeetingPlanSummary) => {
    if (expanded === plan.id) { setExpanded(null); return }
    setExpanded(plan.id)
    if (!detailBlocks[plan.id]) {
      const detail = await planningApi.getPlan(groupId, plan.meetingDate)
      if (detail) setDetailBlocks((prev) => ({ ...prev, [plan.id]: detail.blocks }))
    }
  }

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).replace(' р.', '')

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
  if (plans.length === 0) return <Text type="secondary">Збережених планів ще немає</Text>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {plans.map((p) => (
        <div key={p.id}>
          <button onClick={() => expand(p)} style={{ width: '100%', background: 'none', border: 'none', padding: '8px 0', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>{fmt(p.meetingDate)}</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                  {p.blockCount} блоків{p.appliedTemplateName ? ` · ${p.appliedTemplateName}` : ''}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{expanded === p.id ? '▲' : '▼'}</Text>
            </div>
          </button>
          {expanded === p.id && detailBlocks[p.id] && (
            <div style={{ paddingLeft: 8, paddingBottom: 8 }}>
              {detailBlocks[p.id].map((b, i) => (
                <div key={i} style={{ fontSize: 12, padding: '2px 0', color: 'rgba(0,0,0,0.55)' }}>
                  <Text strong style={{ marginRight: 6, fontSize: 12 }}>{b.time}</Text>
                  {b.title}
                  {b.info && <Text type="secondary"> · {b.info}</Text>}
                  {b.responsible && <Text style={{ color: '#2AAFCA' }}> · {b.responsible}</Text>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Planning page ─────────────────────────────────────────────────────────────

export function PlanningPageDesktop() {
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
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    Promise.all([
      planningApi.getPlan(groupId, date),
      planningApi.getTemplates(),
      groupsApi.getCabinet(groupId),
    ]).then(([plan, tmplts, cabinet]) => {
      setTemplates(tmplts)
      setOrgTeam(cabinet.orgTeam.map((m) => ({ id: m.id, name: [m.name, m.lastName].filter(Boolean).join(' ') })))
      if (plan) {
        setBlocks(plan.blocks.map((b) => ({ ...b, info: b.info ?? '', responsible: b.responsible ?? '' })))
        setAppliedTemplateName(plan.appliedTemplateName ?? null)
      }
    }).finally(() => setLoading(false))
  }, [groupId, date])

  const applyTemplate = (t: PlanTemplate) => {
    setBlocks(t.blocks.map((b, i) => ({ order: i, time: b.time, title: b.title, info: b.info ?? '', responsible: b.responsible ?? '' })))
    setNewBlockKeys([]); setAppliedTemplateName(t.name); setTemplateModalOpen(false)
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
        meetingDate: date, appliedTemplateName,
        blocks: blocks.map((b, i) => ({
          order: i, time: b.time, title: b.title,
          info: (b.info || null) as unknown as string,
          responsible: (b.responsible || null) as unknown as string,
        })),
      })
      setNewBlockKeys([])
    } catch {
      Modal.error({ title: 'Помилка збереження' })
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
      setSaveTemplateOpen(false); setNewTemplateName('')
    } catch {
      Modal.error({ title: 'Помилка збереження шаблону' })
    }
    setSavingTemplate(false)
  }

  const deleteTemplate = (t: PlanTemplate) => {
    Modal.confirm({
      title: `Видалити шаблон "${t.name}"?`,
      okText: 'Видалити', okType: 'danger', cancelText: 'Скасувати',
      onOk: async () => {
        await planningApi.deleteTemplate(t.id)
        setTemplates((prev) => prev.filter((x) => x.id !== t.id))
      },
    })
  }

  const fmtHeader = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    const wd = d.toLocaleDateString('uk-UA', { weekday: 'short' })
    const dm = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
    return `${wd}, ${dm} ${d.getFullYear()}`
  }

  if (loading) return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/cabinet/${groupId}`)}>Назад</Button>
        <Title level={3} style={{ margin: 0 }}>Планування</Title>
      </Space>
      <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/cabinet/${groupId}`)}>Назад</Button>
          <Title level={3} style={{ margin: 0 }}>Планування — {fmtHeader(date)}</Title>
        </Space>
        <Space>
          {blocks.length > 0 && (
            <Button onClick={() => { setNewTemplateName(''); setSaveTemplateOpen(true) }}>
              Зберегти шаблон
            </Button>
          )}
          <Button onClick={() => setTemplateModalOpen(true)}>Застосувати шаблон</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
            Зберегти план
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Blocks column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blocks.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.35)', padding: '24px 0', fontSize: 14 }}>
                Додайте перший блок або застосуйте шаблон
              </div>
            )}
            {blocks.map((block, i) => (
              <BlockCard
                key={i} block={block} index={i} total={blocks.length} orgTeam={orgTeam}
                defaultEditing={newBlockKeys.includes(i)}
                onChange={(patch) => updateBlock(i, patch)}
                onDelete={() => deleteBlock(i)}
                onMove={(dir) => moveBlock(i, dir)}
              />
            ))}
            <Button
              type="dashed" icon={<PlusOutlined />} block onClick={addBlock}
              style={{ height: 48, fontWeight: 600 }}
            >
              Додати блок
            </Button>
          </div>
        </div>

        {/* Past plans sidebar */}
        <Card title="Минулі плани" style={{ width: 320, flexShrink: 0 }}>
          <PastPlansPanel groupId={groupId} />
        </Card>
      </div>

      {/* Template selector modal */}
      <Modal
        open={templateModalOpen}
        title="Застосувати шаблон"
        onCancel={() => setTemplateModalOpen(false)}
        footer={null}
        width={480}
      >
        {templates.length === 0 ? (
          <Text type="secondary">Шаблонів ще немає. Збережіть поточний план як шаблон.</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {templates.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.08)' }}>
                <div>
                  <Text strong>{t.name}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{t.blocks.length} блоків</Text>
                </div>
                <Space>
                  <Button type="primary" size="small" onClick={() => applyTemplate(t)}>Застосувати</Button>
                  <Button danger size="small" icon={<DeleteOutlined />} onClick={() => deleteTemplate(t)} />
                </Space>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Save template modal */}
      <Modal
        open={saveTemplateOpen}
        title="Зберегти як шаблон"
        onCancel={() => setSaveTemplateOpen(false)}
        onOk={saveAsTemplate}
        okText="Зберегти"
        cancelText="Скасувати"
        confirmLoading={savingTemplate}
      >
        <Input
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          placeholder="Назва шаблону"
          autoFocus
        />
      </Modal>
    </div>
  )
}
