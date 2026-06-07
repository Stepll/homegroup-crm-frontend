import { useEffect, useRef, useState } from 'react'
import {
  Modal, Button, Checkbox, Switch, Select, DatePicker, Spin, message,
  Card, Tag, Collapse, Radio, Empty, Typography, Space, Divider, Tabs,
} from 'antd'
import {
  DownloadOutlined, UploadOutlined, InboxOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { attendanceApi, downloadBlob } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { usePermission } from '@/hooks/usePermission'
import type {
  Group, ImportPreviewResponse, ImportSheetPreview, ImportSheetDecision,
  PersonDecision, ConflictResolution, ImportConflict, ImportPersonPreview,
} from '@/types'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

type Mode = 'menu' | 'export' | 'import-upload' | 'import-preview' | 'import-applying'

interface Props {
  visible: boolean
  onClose: () => void
  defaultGroupId?: number
  onImported?: () => void
}

export function AttendanceImportExportPopupDesktop({ visible, onClose, defaultGroupId, onImported }: Props) {
  const canImport = usePermission('attendance.record')
  const [mode, setMode] = useState<Mode>('menu')

  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)

  const [exportGroupIds, setExportGroupIds] = useState<number[]>(defaultGroupId ? [defaultGroupId] : [])
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [exporting, setExporting] = useState(false)

  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [decisions, setDecisions] = useState<ImportSheetDecision[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setMode('menu')
        setPreview(null)
        setDecisions([])
      }, 200)
    }
  }, [visible])

  useEffect(() => {
    if (!visible || groups.length > 0) return
    setGroupsLoading(true)
    groupsApi.getAll()
      .then(setGroups)
      .catch(() => message.error('Не вдалось завантажити список груп'))
      .finally(() => setGroupsLoading(false))
  }, [visible])

  useEffect(() => {
    if (defaultGroupId && !exportGroupIds.includes(defaultGroupId)) {
      setExportGroupIds([defaultGroupId])
    }
  }, [defaultGroupId])

  // ── Export ──────────────────────────────────────────────────────────────────
  async function handleExport(isTemplate = false) {
    if (exportGroupIds.length === 0) {
      message.error('Виберіть хоча б одну групу')
      return
    }
    setExporting(true)
    try {
      const from = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined
      const to = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined
      const blob = isTemplate
        ? await attendanceApi.template(exportGroupIds)
        : await attendanceApi.export(exportGroupIds, from, to)
      const filename = isTemplate
        ? `attendance-template-${new Date().toISOString().slice(0, 10)}.xlsx`
        : `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`
      downloadBlob(blob, filename)
      message.success('Готово!')
    } catch {
      message.error('Помилка експорту')
    } finally {
      setExporting(false)
    }
  }

  // ── Import upload ───────────────────────────────────────────────────────────
  async function handleFileSelected(file: File) {
    setUploading(true)
    try {
      const res = await attendanceApi.importPreview(file)
      setPreview(res)
      const init: ImportSheetDecision[] = res.sheets.map((s) => ({
        sheetIndex: s.sheetIndex,
        groupId: s.matchedGroupId,
        personDecisions: s.people.map<PersonDecision>((p) => ({
          rowIndex: p.rowIndex,
          action: p.matchType === 'unmatched' ? 'skip' : 'use',
          targetPersonId: p.matchedPersonId,
          targetUserId: p.matchedUserId,
        })),
        conflictResolutions: [],
        importStatus: false,
        importOversight: false,
        importJoinedAt: true,
        importLeftAt: true,
      }))
      setDecisions(init)
      setMode('import-preview')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      message.error(msg || 'Помилка читання файлу')
    } finally {
      setUploading(false)
    }
  }

  // ── Apply ───────────────────────────────────────────────────────────────────
  async function handleApply() {
    if (!preview) return
    const missingGroup = decisions.find((d) => d.groupId == null && hasContent(preview.sheets.find(s => s.sheetIndex === d.sheetIndex)))
    if (missingGroup) {
      message.error('Виберіть групу для всіх вкладок (або встановіть "не імпортувати")')
      return
    }
    setMode('import-applying')
    try {
      const res = await attendanceApi.importApply({ importId: preview.importId, sheets: decisions })
      Modal.success({
        title: 'Імпорт виконано',
        content: (
          <Space direction="vertical">
            <Text>Зустрічей створено: <strong>{res.metaCreated}</strong></Text>
            <Text>Записів відвідуваності додано: <strong>{res.attendanceCreated}</strong></Text>
            {res.attendanceUpdated > 0 && <Text>Оновлено: <strong>{res.attendanceUpdated}</strong></Text>}
            {res.peopleCreated > 0 && <Text>Створено людей: <strong>{res.peopleCreated}</strong></Text>}
            {res.membershipsCreated > 0 && <Text>Долучено до групи: <strong>{res.membershipsCreated}</strong></Text>}
            {res.membershipsLeft > 0 && <Text>Вийшли з групи: <strong>{res.membershipsLeft}</strong></Text>}
          </Space>
        ),
      })
      onImported?.()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      message.error(msg || 'Помилка імпорту')
      setMode('import-preview')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelected(file)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const title = mode === 'menu' ? 'Імпорт / Експорт відвідуваності'
              : mode === 'export' ? 'Експорт у Excel'
              : mode === 'import-upload' ? 'Імпорт з Excel'
              : mode === 'import-preview' ? 'Попередній перегляд'
              : 'Імпорт триває…'

  const width = mode === 'import-preview' ? 1000 : 640

  const footer = (() => {
    if (mode === 'export') {
      return [
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => setMode('menu')}>Назад</Button>,
        <Button key="template" loading={exporting} onClick={() => handleExport(true)}>
          Завантажити шаблон
        </Button>,
        <Button key="export" type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={() => handleExport(false)}>
          Експортувати
        </Button>,
      ]
    }
    if (mode === 'import-upload') {
      return [
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => setMode('menu')}>Назад</Button>,
      ]
    }
    if (mode === 'import-preview') {
      return [
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => setMode('import-upload')}>Назад</Button>,
        <Button key="apply" type="primary" icon={<CheckCircleOutlined />} onClick={handleApply}>
          Імпортувати
        </Button>,
      ]
    }
    return null
  })()

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={title}
      width={width}
      footer={footer}
      destroyOnClose
    >
      {mode === 'menu' && (
        <MenuScreen
          canImport={canImport}
          onPickExport={() => setMode('export')}
          onPickImport={() => setMode('import-upload')}
        />
      )}

      {mode === 'export' && (
        <ExportScreen
          groups={groups}
          loading={groupsLoading}
          selectedIds={exportGroupIds}
          onSelect={setExportGroupIds}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      )}

      {mode === 'import-upload' && (
        <UploadScreen
          uploading={uploading}
          fileInputRef={fileInputRef}
          onPickFile={() => fileInputRef.current?.click()}
          onFileChange={handleFileInput}
          onDrop={handleDrop}
        />
      )}

      {mode === 'import-preview' && preview && (
        <PreviewScreen
          preview={preview}
          decisions={decisions}
          setDecisions={setDecisions}
        />
      )}

      {mode === 'import-applying' && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 20, color: 'rgba(0,0,0,0.45)' }}>Застосовуємо зміни…</div>
        </div>
      )}
    </Modal>
  )
}

// ─── Menu ───────────────────────────────────────────────────────────────────────

function MenuScreen({ canImport, onPickExport, onPickImport }: { canImport: boolean; onPickExport: () => void; onPickImport: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: canImport ? '1fr 1fr' : '1fr', gap: 16, padding: '12px 0' }}>
      <Card hoverable onClick={onPickExport} style={menuCardStyle}>
        <DownloadOutlined style={{ fontSize: 36, color: 'var(--color-primary, #2AAFCA)', marginBottom: 12 }} />
        <Title level={5} style={{ margin: 0 }}>Експорт у Excel</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Завантажити таблицю або порожній шаблон</Text>
      </Card>
      {canImport && (
        <Card hoverable onClick={onPickImport} style={menuCardStyle}>
          <UploadOutlined style={{ fontSize: 36, color: 'var(--color-primary, #2AAFCA)', marginBottom: 12 }} />
          <Title level={5} style={{ margin: 0 }}>Імпорт з Excel</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Завантажити заповнений шаблон</Text>
        </Card>
      )}
    </div>
  )
}

// ─── Export ─────────────────────────────────────────────────────────────────────

function ExportScreen(props: {
  groups: Group[]
  loading: boolean
  selectedIds: number[]
  onSelect: (ids: number[]) => void
  dateRange: [Dayjs | null, Dayjs | null] | null
  onDateRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void
}) {
  const allIds = props.groups.map((g) => g.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => props.selectedIds.includes(id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Групи</Text>
        {props.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spin /></div>
        ) : (
          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 12, maxHeight: 280, overflowY: 'auto' }}>
            <Checkbox
              indeterminate={!allSelected && props.selectedIds.length > 0}
              checked={allSelected}
              onChange={(e) => props.onSelect(e.target.checked ? allIds : [])}
              style={{ fontWeight: 600 }}
            >
              Всі домашки ({props.groups.length})
            </Checkbox>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {props.groups.map((g) => (
                <Checkbox
                  key={g.id}
                  checked={props.selectedIds.includes(g.id)}
                  onChange={(e) => props.onSelect(
                    e.target.checked
                      ? [...props.selectedIds, g.id]
                      : props.selectedIds.filter((x) => x !== g.id)
                  )}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                    {g.name}
                  </span>
                </Checkbox>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Період (опційно)</Text>
        <RangePicker
          value={props.dateRange ?? undefined}
          onChange={(range) => props.onDateRangeChange(range ? [range[0], range[1]] : null)}
          style={{ width: '100%' }}
          format="DD.MM.YYYY"
          placeholder={['Від', 'До']}
        />
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          Якщо не вказано — експортуються всі відомі дати
        </Text>
      </div>
    </div>
  )
}

// ─── Upload ─────────────────────────────────────────────────────────────────────

function UploadScreen(props: {
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onPickFile: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div style={{ padding: '12px 0' }}>
      <input
        ref={props.fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: 'none' }}
        onChange={props.onFileChange}
      />
      {props.uploading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: 'rgba(0,0,0,0.45)' }}>Розбираємо файл…</div>
        </div>
      ) : (
        <div
          onClick={props.onPickFile}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { setDragOver(false); props.onDrop(e) }}
          style={{
            border: `2px dashed ${dragOver ? '#2AAFCA' : 'rgba(0,0,0,0.15)'}`,
            borderRadius: 12,
            background: dragOver ? 'rgba(42,175,202,0.04)' : '#FAFAFA',
            padding: '60px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <InboxOutlined style={{ fontSize: 56, color: dragOver ? '#2AAFCA' : 'rgba(0,0,0,0.35)' }} />
          <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
            Перетягніть файл сюди або клікніть щоб вибрати
          </Title>
          <Text type="secondary">.xlsx файл (Excel). Структура має співпадати з шаблоном.</Text>
        </div>
      )}
    </div>
  )
}

// ─── Preview ────────────────────────────────────────────────────────────────────

function PreviewScreen(props: {
  preview: ImportPreviewResponse
  decisions: ImportSheetDecision[]
  setDecisions: (d: ImportSheetDecision[]) => void
}) {
  const [activeSheet, setActiveSheet] = useState<number>(props.preview.sheets[0]?.sheetIndex ?? 0)

  function updateDecision(sheetIndex: number, patch: Partial<ImportSheetDecision>) {
    props.setDecisions(props.decisions.map((d) =>
      d.sheetIndex === sheetIndex ? { ...d, ...patch } : d))
  }

  const items = props.preview.sheets.map((sheet) => {
    const decision = props.decisions.find((d) => d.sheetIndex === sheet.sheetIndex)
    const unmatchedCount = sheet.people.filter((p) => p.matchType === 'unmatched').length
    const conflictCount = sheet.conflicts.length
    return {
      key: String(sheet.sheetIndex),
      label: (
        <Space>
          <span>{sheet.sheetName}</span>
          {unmatchedCount > 0 && <Tag color="error">{unmatchedCount}</Tag>}
          {conflictCount > 0 && <Tag color="warning">{conflictCount}</Tag>}
        </Space>
      ),
      children: decision ? (
        <SheetContent
          sheet={sheet}
          decision={decision}
          availableGroups={props.preview.availableGroups}
          onUpdate={(patch) => updateDecision(sheet.sheetIndex, patch)}
        />
      ) : null,
    }
  })

  return (
    <Tabs
      type="card"
      activeKey={String(activeSheet)}
      onChange={(k) => setActiveSheet(Number(k))}
      items={items}
    />
  )
}

function SheetContent(props: {
  sheet: ImportSheetPreview
  decision: ImportSheetDecision
  availableGroups: { id: number; name: string }[]
  onUpdate: (patch: Partial<ImportSheetDecision>) => void
}) {
  const { sheet, decision } = props

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 8 }}>
      {/* Left column: group + toggles + summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card size="small" title="Зберегти до групи">
          <Select
            style={{ width: '100%' }}
            value={decision.groupId ?? undefined}
            onChange={(v) => props.onUpdate({ groupId: v ?? null })}
            placeholder="Виберіть групу"
            allowClear
            showSearch
            optionFilterProp="label"
            options={props.availableGroups.map((g) => ({ value: g.id, label: g.name }))}
          />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            Очисти щоб пропустити цю вкладку
          </Text>
        </Card>

        <Card size="small" title="Що ще імпортувати">
          <Space direction="vertical" style={{ width: '100%' }}>
            <ToggleRow label="Дата приєднання" checked={decision.importJoinedAt}
                       onChange={(v) => props.onUpdate({ importJoinedAt: v })} />
            <ToggleRow label="Вихід з групи (детектовано)" checked={decision.importLeftAt}
                       onChange={(v) => props.onUpdate({ importLeftAt: v })} />
            <ToggleRow label="Статус людей" checked={decision.importStatus}
                       onChange={(v) => props.onUpdate({ importStatus: v })} />
            <ToggleRow label="Опіка" checked={decision.importOversight}
                       onChange={(v) => props.onUpdate({ importOversight: v })} />
          </Space>
        </Card>

        <ChangesSummary sheet={sheet} />
      </div>

      {/* Right column: conflicts + people */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 540, overflowY: 'auto', paddingRight: 4 }}>
        {sheet.conflicts.length > 0 && (
          <ConflictsBlock
            conflicts={sheet.conflicts}
            resolutions={decision.conflictResolutions}
            onChange={(rs) => props.onUpdate({ conflictResolutions: rs })}
          />
        )}
        <PeopleBlock
          people={sheet.people}
          personDecisions={decision.personDecisions}
          onChange={(pd) => props.onUpdate({ personDecisions: pd })}
        />
      </div>
    </div>
  )
}

function ChangesSummary({ sheet }: { sheet: ImportSheetPreview }) {
  const { changes } = sheet
  const items = [
    { label: 'Нових зустрічей', value: changes.newMeetings },
    { label: 'Нових записів', value: changes.newAttendanceRecords },
    { label: 'Оновлено', value: changes.updatedAttendanceRecords },
    { label: 'Скасовано', value: changes.cancelledMeetings },
  ].filter((x) => x.value > 0)

  return (
    <Card size="small" title="Що буде застосовано">
      {items.length === 0 ? (
        <Text type="secondary">Без змін</Text>
      ) : (
        items.map((x) => (
          <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">{x.label}</Text>
            <Text strong>{x.value}</Text>
          </div>
        ))
      )}
    </Card>
  )
}

function ConflictsBlock(props: {
  conflicts: ImportConflict[]
  resolutions: ConflictResolution[]
  onChange: (rs: ConflictResolution[]) => void
}) {
  function setOne(c: ImportConflict, useFile: boolean) {
    const filtered = props.resolutions.filter((r) =>
      !(r.type === c.type && r.date === c.date && r.personRowIndex === c.personRowIndex))
    props.onChange([
      ...filtered,
      { type: c.type, date: c.date, personRowIndex: c.personRowIndex, useFile },
    ])
  }

  function setAllOfType(type: string, useFile: boolean) {
    const sameType = props.conflicts.filter((c) => c.type === type)
    const filtered = props.resolutions.filter((r) => r.type !== type)
    props.onChange([
      ...filtered,
      ...sameType.map((c) => ({ type: c.type, date: c.date, personRowIndex: c.personRowIndex, useFile })),
    ])
  }

  function resolutionFor(c: ImportConflict): boolean | null {
    const found = props.resolutions.find((r) =>
      r.type === c.type && r.date === c.date && r.personRowIndex === c.personRowIndex)
    return found ? found.useFile : null
  }

  const grouped = props.conflicts.reduce<Record<string, ImportConflict[]>>((acc, c) => {
    (acc[c.type] ||= []).push(c)
    return acc
  }, {})

  const labels: Record<string, string> = {
    attendance: 'Відвідуваність',
    cancellation: 'Скасування',
    guests: 'Гості',
    notes: 'Нотатки',
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#D97706' }} />
          Конфлікти ({props.conflicts.length})
        </Space>
      }
      style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        За замовч. береться значення з файлу. Можна явно вибрати «з БД».
      </Text>

      <Collapse
        size="small"
        defaultActiveKey={Object.keys(grouped)}
        items={Object.entries(grouped).map(([type, conflicts]) => ({
          key: type,
          label: <span>{labels[type] || type} <Tag>{conflicts.length}</Tag></span>,
          extra: (
            <Space size={4} onClick={(e) => e.stopPropagation()}>
              <Button size="small" onClick={() => setAllOfType(type, true)}>Всі з файлу</Button>
              <Button size="small" onClick={() => setAllOfType(type, false)}>Всі з БД</Button>
            </Space>
          ),
          children: (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {conflicts.map((c, i) => {
                const r = resolutionFor(c)
                return (
                  <div key={i} style={{ padding: '6px 0', borderTop: i > 0 ? '1px dashed #FDE68A' : undefined }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      <strong>{c.date}</strong>
                      {c.personName && <Text type="secondary"> · {c.personName}</Text>}
                    </div>
                    <Radio.Group
                      size="small"
                      value={r === null ? 'file' : (r ? 'file' : 'db')}
                      onChange={(e) => setOne(c, e.target.value === 'file')}
                    >
                      <Radio.Button value="file">Файл: <strong>{c.fileValue}</strong></Radio.Button>
                      <Radio.Button value="db">БД: <strong>{c.dbValue}</strong></Radio.Button>
                    </Radio.Group>
                  </div>
                )
              })}
            </div>
          ),
        }))}
      />
    </Card>
  )
}

function PeopleBlock(props: {
  people: ImportPersonPreview[]
  personDecisions: PersonDecision[]
  onChange: (pd: PersonDecision[]) => void
}) {
  const unmatched = props.people.filter((p) => p.matchType === 'unmatched')
  const matched = props.people.filter((p) => p.matchType !== 'unmatched')

  function update(rowIndex: number, patch: Partial<PersonDecision>) {
    props.onChange(props.personDecisions.map((d) =>
      d.rowIndex === rowIndex ? { ...d, ...patch } : d))
  }
  function decisionFor(rowIndex: number) {
    return props.personDecisions.find((d) => d.rowIndex === rowIndex)
  }

  return (
    <Card size="small" title={`Люди (${props.people.length})`}>
      <Collapse
        size="small"
        defaultActiveKey={unmatched.length > 0 ? ['unmatched'] : []}
        items={[
          ...(unmatched.length > 0 ? [{
            key: 'unmatched',
            label: <Space>Невпізнано <Tag color="error">{unmatched.length}</Tag></Space>,
            children: (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {unmatched.map((p) => (
                  <UnmatchedRow
                    key={p.rowIndex}
                    person={p}
                    decision={decisionFor(p.rowIndex)!}
                    onUpdate={(patch) => update(p.rowIndex, patch)}
                  />
                ))}
              </div>
            ),
          }] : []),
          ...(matched.length > 0 ? [{
            key: 'matched',
            label: <Space>Знайдено в системі <Tag color="success">{matched.length}</Tag></Space>,
            children: (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {matched.map((p) => (
                  <MatchedRow
                    key={p.rowIndex}
                    person={p}
                    decision={decisionFor(p.rowIndex)!}
                    onUpdate={(patch) => update(p.rowIndex, patch)}
                  />
                ))}
              </div>
            ),
          }] : []),
        ]}
      />
      {props.people.length === 0 && <Empty description="У файлі немає людей" />}
    </Card>
  )
}

function MatchedRow(props: {
  person: ImportPersonPreview
  decision: PersonDecision
  onUpdate: (patch: Partial<PersonDecision>) => void
}) {
  const { person, decision } = props
  const fullName = [person.lastName, person.name].filter(Boolean).join(' ') || person.name
  const skip = decision.action === 'skip'
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ flex: 1 }}>
        <Text strong delete={skip} style={{ color: skip ? 'rgba(0,0,0,0.35)' : undefined }}>{fullName}</Text>
        <div>
          <Space size={6} style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
            <span>✓ {person.filePresentCount}</span>
            <span>✗ {person.fileAbsentCount}</span>
            {person.matchType === 'by_id' && <Tag color="blue">по ID</Tag>}
            {person.matchType === 'by_name' && <Tag>по імені</Tag>}
            {person.detectedLeftAt && <Tag color="orange">вихід {person.detectedLeftAt}</Tag>}
          </Space>
        </div>
      </div>
      <Switch
        checked={!skip}
        size="small"
        onChange={(v) => props.onUpdate({ action: v ? 'use' : 'skip' })}
      />
    </div>
  )
}

function UnmatchedRow(props: {
  person: ImportPersonPreview
  decision: PersonDecision
  onUpdate: (patch: Partial<PersonDecision>) => void
}) {
  const { person, decision } = props
  const fullName = [person.lastName, person.name].filter(Boolean).join(' ') || person.name

  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <Text strong>{fullName}</Text>
      <div style={{ marginTop: 6, marginBottom: 6 }}>
        <Radio.Group
          size="small"
          value={decision.action}
          onChange={(e) => {
            const action = e.target.value as PersonDecision['action']
            props.onUpdate({
              action,
              targetPersonId: action === 'link' ? decision.targetPersonId : null,
              targetUserId: action === 'link' ? decision.targetUserId : null,
            })
          }}
        >
          <Radio.Button value="skip">Пропустити</Radio.Button>
          <Radio.Button value="create">Створити</Radio.Button>
          <Radio.Button value="link" disabled={person.suggestions.length === 0}>Прив'язати</Radio.Button>
        </Radio.Group>
      </div>

      {decision.action === 'link' && person.suggestions.length > 0 && (
        <Select
          size="small"
          style={{ width: '100%' }}
          placeholder="Виберіть людину"
          value={`${decision.targetPersonId || ''}|${decision.targetUserId || ''}`}
          onChange={(v) => {
            const [pId, uId] = v.split('|')
            props.onUpdate({
              targetPersonId: pId ? Number(pId) : null,
              targetUserId: uId ? Number(uId) : null,
            })
          }}
          options={person.suggestions.map((s) => {
            const val = `${s.personId || ''}|${s.userId || ''}`
            const name = [s.lastName, s.name].filter(Boolean).join(' ')
            const tag = s.isAdmin ? ' (адмін)' : ''
            const grp = s.primaryGroupName ? ` — ${s.primaryGroupName}` : ''
            return { value: val, label: `${name}${tag}${grp}` }
          })}
        />
      )}

      {decision.action === 'create' && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          Створимо нову людину «{fullName}» в обраній групі
        </Text>
      )}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <Text>{label}</Text>
      <Switch size="small" checked={checked} onChange={onChange} />
    </div>
  )
}

function hasContent(sheet: ImportSheetPreview | undefined): boolean {
  if (!sheet) return false
  return sheet.people.length > 0 || sheet.dates.length > 0
}

const menuCardStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '32px 16px',
  cursor: 'pointer',
}
