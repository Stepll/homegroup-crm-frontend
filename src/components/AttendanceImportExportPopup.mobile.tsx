import { useEffect, useRef, useState } from 'react'
import { Popup, Button, Toast, SpinLoading, Checkbox, Switch, Dialog, Selector } from 'antd-mobile'
import { CloseOutline, FileOutline, DownlandOutline } from 'antd-mobile-icons'
import { attendanceApi, downloadBlob } from '@/api/attendance'
import { groupsApi } from '@/api/groups'
import { usePermission } from '@/hooks/usePermission'
import type {
  Group, ImportPreviewResponse, ImportSheetPreview, ImportSheetDecision,
  PersonDecision, ConflictResolution, ImportConflict, ImportPersonPreview,
} from '@/types'

type Mode = 'menu' | 'export' | 'import-upload' | 'import-preview' | 'import-applying'

interface Props {
  visible: boolean
  onClose: () => void
  /** When set, this group is pre-selected in export and shown first. */
  defaultGroupId?: number
  /** Called after a successful import so the parent can reload its data. */
  onImported?: () => void
}

export function AttendanceImportExportPopupMobile({ visible, onClose, defaultGroupId, onImported }: Props) {
  const canImport = usePermission('attendance.record')
  const [mode, setMode] = useState<Mode>('menu')

  // Shared
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)

  // Export state
  const [exportGroupIds, setExportGroupIds] = useState<number[]>(defaultGroupId ? [defaultGroupId] : [])
  const [exportFrom, setExportFrom] = useState<string>('')
  const [exportTo, setExportTo] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  // Import state
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [decisions, setDecisions] = useState<ImportSheetDecision[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setMode('menu')
        setPreview(null)
        setDecisions([])
      }, 200)
    }
  }, [visible])

  // Load groups once
  useEffect(() => {
    if (!visible || groups.length > 0) return
    setGroupsLoading(true)
    groupsApi.getAll()
      .then(setGroups)
      .catch(() => Toast.show({ content: 'Не вдалось завантажити список груп', icon: 'fail' }))
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
      Toast.show({ content: 'Виберіть хоча б одну групу', icon: 'fail' })
      return
    }
    setExporting(true)
    try {
      const blob = isTemplate
        ? await attendanceApi.template(exportGroupIds)
        : await attendanceApi.export(exportGroupIds, exportFrom || undefined, exportTo || undefined)
      const filename = isTemplate
        ? `attendance-template-${new Date().toISOString().slice(0, 10)}.xlsx`
        : `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`
      downloadBlob(blob, filename)
      Toast.show({ content: 'Готово!', icon: 'success' })
    } catch {
      Toast.show({ content: 'Помилка експорту', icon: 'fail' })
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
      // Initialize decisions
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
      Toast.show({ content: msg || 'Помилка читання файлу', icon: 'fail' })
    } finally {
      setUploading(false)
    }
  }

  // ── Apply ───────────────────────────────────────────────────────────────────
  async function handleApply() {
    if (!preview) return
    // Validate: each enabled sheet must have group
    const missingGroup = decisions.find((d) => d.groupId == null && hasContent(preview.sheets.find(s => s.sheetIndex === d.sheetIndex)))
    if (missingGroup) {
      Toast.show({ content: 'Виберіть групу для всіх вкладок', icon: 'fail' })
      return
    }
    setMode('import-applying')
    try {
      const res = await attendanceApi.importApply({ importId: preview.importId, sheets: decisions })
      const summary = [
        `Зустрічей створено: ${res.metaCreated}`,
        `Записів додано: ${res.attendanceCreated}`,
        res.attendanceUpdated > 0 ? `Оновлено: ${res.attendanceUpdated}` : null,
        res.peopleCreated > 0 ? `Створено людей: ${res.peopleCreated}` : null,
        res.membershipsCreated > 0 ? `Долучено до групи: ${res.membershipsCreated}` : null,
        res.membershipsLeft > 0 ? `Вийшли з групи: ${res.membershipsLeft}` : null,
      ].filter(Boolean).join(' · ')
      Toast.show({ content: 'Імпорт виконано!', icon: 'success' })
      await Dialog.alert({ content: summary || 'Готово' })
      onImported?.()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      Toast.show({ content: msg || 'Помилка імпорту', icon: 'fail' })
      setMode('import-preview')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: '90vh',
        borderRadius: '16px 16px 0 0',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
          {mode === 'menu' && 'Імпорт / Експорт'}
          {mode === 'export' && 'Експорт у Excel'}
          {mode === 'import-upload' && 'Імпорт з Excel'}
          {mode === 'import-preview' && 'Попередній перегляд'}
          {mode === 'import-applying' && 'Імпорт триває…'}
        </div>
        <button onClick={onClose} style={closeBtnStyle} aria-label="Закрити">
          <CloseOutline fontSize={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
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
            from={exportFrom} onFromChange={setExportFrom}
            to={exportTo} onToChange={setExportTo}
            exporting={exporting}
            onExport={() => handleExport(false)}
            onTemplate={() => handleExport(true)}
          />
        )}

        {mode === 'import-upload' && (
          <UploadScreen
            uploading={uploading}
            fileInputRef={fileInputRef}
            onPickFile={() => fileInputRef.current?.click()}
            onFileChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelected(file)
            }}
          />
        )}

        {mode === 'import-preview' && preview && (
          <PreviewScreen
            preview={preview}
            decisions={decisions}
            setDecisions={setDecisions}
            availableGroups={preview.availableGroups}
          />
        )}

        {mode === 'import-applying' && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <SpinLoading color="primary" />
            <div style={{ marginTop: 20, color: 'var(--color-text-secondary)' }}>Зачекайте…</div>
          </div>
        )}
      </div>

      {/* Footer */}
      {mode === 'import-preview' && preview && (
        <div style={footerStyle}>
          <Button fill="outline" size="large" style={{ flex: 1 }} onClick={() => setMode('import-upload')}>
            Назад
          </Button>
          <Button color="primary" size="large" style={{ flex: 2 }} onClick={handleApply}>
            Імпортувати
          </Button>
        </div>
      )}
      {mode === 'export' && (
        <div style={footerStyle}>
          <Button fill="outline" size="large" style={{ flex: 1 }} onClick={() => setMode('menu')}>
            Назад
          </Button>
        </div>
      )}
      {mode === 'import-upload' && (
        <div style={footerStyle}>
          <Button fill="outline" size="large" style={{ flex: 1 }} onClick={() => setMode('menu')}>
            Назад
          </Button>
        </div>
      )}
    </Popup>
  )
}

// ─── Sub-screens ────────────────────────────────────────────────────────────────

function MenuScreen({ canImport, onPickExport, onPickImport }: { canImport: boolean; onPickExport: () => void; onPickImport: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onPickExport} style={menuItemStyle}>
        <DownlandOutline fontSize={28} color="var(--color-primary)" />
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Експорт у Excel</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Завантажити таблицю або шаблон
          </div>
        </div>
      </button>

      {canImport && (
        <button onClick={onPickImport} style={menuItemStyle}>
          <FileOutline fontSize={28} color="var(--color-primary)" />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Імпорт з Excel</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Завантажити заповнений шаблон
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

function ExportScreen(props: {
  groups: Group[]
  loading: boolean
  selectedIds: number[]
  onSelect: (ids: number[]) => void
  from: string
  onFromChange: (v: string) => void
  to: string
  onToChange: (v: string) => void
  exporting: boolean
  onExport: () => void
  onTemplate: () => void
}) {
  const allIds = props.groups.map((g) => g.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => props.selectedIds.includes(id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={sectionLabelStyle}>Групи</div>
        {props.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><SpinLoading color="primary" /></div>
        ) : (
          <>
            <label style={selectableRow(allSelected)}>
              <Checkbox
                checked={allSelected}
                onChange={(checked) => props.onSelect(checked ? allIds : [])}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Всі домашки</span>
            </label>
            <div style={{ borderTop: '1px solid var(--color-border-light)', margin: '4px 0' }} />
            {props.groups.map((g) => {
              const isSelected = props.selectedIds.includes(g.id)
              return (
                <label key={g.id} style={selectableRow(isSelected)}>
                  <Checkbox
                    checked={isSelected}
                    onChange={(checked) => {
                      props.onSelect(checked
                        ? [...props.selectedIds, g.id]
                        : props.selectedIds.filter((x) => x !== g.id))
                    }}
                  />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14 }}>{g.name}</span>
                </label>
              )
            })}
          </>
        )}
      </div>

      <div>
        <div style={sectionLabelStyle}>Період (опційно)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={props.from} onChange={(e) => props.onFromChange(e.target.value)}
                 style={dateInputStyle} placeholder="Від" />
          <input type="date" value={props.to} onChange={(e) => props.onToChange(e.target.value)}
                 style={dateInputStyle} placeholder="До" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Якщо не вказано — експортуються всі відомі дати
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <Button color="primary" size="large" loading={props.exporting} onClick={props.onExport}>
          Експортувати з даними
        </Button>
        <Button fill="outline" size="large" loading={props.exporting} onClick={props.onTemplate}>
          Завантажити шаблон
        </Button>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 4 }}>
          Шаблон = вкладки з людьми, але без даних відвідуваності
        </div>
      </div>
    </div>
  )
}

function UploadScreen(props: {
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onPickFile: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div style={{ paddingTop: 20, textAlign: 'center' }}>
      <input
        ref={props.fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: 'none' }}
        onChange={props.onFileChange}
      />
      {props.uploading ? (
        <div>
          <SpinLoading color="primary" />
          <div style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Розбираємо файл…</div>
        </div>
      ) : (
        <>
          <FileOutline fontSize={48} color="var(--color-text-tertiary)" />
          <div style={{ marginTop: 16, marginBottom: 4, fontSize: 15, fontWeight: 600 }}>
            Виберіть .xlsx файл
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 24 }}>
            Структура має співпадати з нашим шаблоном
          </div>
          <Button color="primary" size="large" onClick={props.onPickFile}>
            Вибрати файл
          </Button>
        </>
      )}
    </div>
  )
}

// ─── Preview screen ─────────────────────────────────────────────────────────────

function PreviewScreen(props: {
  preview: ImportPreviewResponse
  decisions: ImportSheetDecision[]
  setDecisions: (d: ImportSheetDecision[]) => void
  availableGroups: { id: number; name: string }[]
}) {
  const [expandedSheet, setExpandedSheet] = useState<number | null>(props.preview.sheets[0]?.sheetIndex ?? null)

  function updateDecision(sheetIndex: number, patch: Partial<ImportSheetDecision>) {
    props.setDecisions(props.decisions.map((d) =>
      d.sheetIndex === sheetIndex ? { ...d, ...patch } : d))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {props.preview.sheets.map((sheet) => {
        const decision = props.decisions.find((d) => d.sheetIndex === sheet.sheetIndex)
        if (!decision) return null
        const isExpanded = expandedSheet === sheet.sheetIndex
        return (
          <SheetCard
            key={sheet.sheetIndex}
            sheet={sheet}
            decision={decision}
            isExpanded={isExpanded}
            onToggle={() => setExpandedSheet(isExpanded ? null : sheet.sheetIndex)}
            availableGroups={props.availableGroups}
            onUpdate={(patch) => updateDecision(sheet.sheetIndex, patch)}
          />
        )
      })}
    </div>
  )
}

function SheetCard(props: {
  sheet: ImportSheetPreview
  decision: ImportSheetDecision
  isExpanded: boolean
  onToggle: () => void
  availableGroups: { id: number; name: string }[]
  onUpdate: (patch: Partial<ImportSheetDecision>) => void
}) {
  const { sheet, decision } = props
  const conflictCount = sheet.conflicts.length
  const unmatchedCount = sheet.people.filter((p) => p.matchType === 'unmatched').length

  return (
    <div style={cardStyle}>
      {/* Header */}
      <button onClick={props.onToggle} style={cardHeaderStyle}>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{sheet.sheetName}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {sheet.people.length} людей · {sheet.dates.length} дат
            {unmatchedCount > 0 && <span style={{ color: '#DC2626' }}> · {unmatchedCount} невпізнано</span>}
            {conflictCount > 0 && <span style={{ color: '#D97706' }}> · {conflictCount} конфліктів</span>}
          </div>
        </div>
        <div style={{ fontSize: 14 }}>{props.isExpanded ? '▼' : '▶'}</div>
      </button>

      {props.isExpanded && (
        <div style={{ padding: '0 12px 12px' }}>
          {/* Group selection */}
          <div style={{ marginBottom: 12 }}>
            <div style={sectionLabelStyle}>Зберегти до групи</div>
            <select
              value={decision.groupId ?? ''}
              onChange={(e) => props.onUpdate({ groupId: e.target.value ? Number(e.target.value) : null })}
              style={selectStyle}
            >
              <option value="">— Не імпортувати цю вкладку —</option>
              {props.availableGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Import toggles */}
          <div style={{ marginBottom: 12 }}>
            <div style={sectionLabelStyle}>Що ще імпортувати</div>
            <ToggleRow label="Дата приєднання" checked={decision.importJoinedAt}
                       onChange={(v) => props.onUpdate({ importJoinedAt: v })} />
            <ToggleRow label="Вихід з групи (якщо детектовано)" checked={decision.importLeftAt}
                       onChange={(v) => props.onUpdate({ importLeftAt: v })} />
            <ToggleRow label="Статус людей" checked={decision.importStatus}
                       onChange={(v) => props.onUpdate({ importStatus: v })} />
            <ToggleRow label="Опіка" checked={decision.importOversight}
                       onChange={(v) => props.onUpdate({ importOversight: v })} />
          </div>

          {/* Summary */}
          <ChangesSummary sheet={sheet} />

          {/* Conflicts */}
          {sheet.conflicts.length > 0 && (
            <ConflictsBlock
              conflicts={sheet.conflicts}
              resolutions={decision.conflictResolutions}
              onChange={(rs) => props.onUpdate({ conflictResolutions: rs })}
            />
          )}

          {/* People */}
          <PeopleBlock
            people={sheet.people}
            personDecisions={decision.personDecisions}
            onChange={(pd) => props.onUpdate({ personDecisions: pd })}
          />
        </div>
      )}
    </div>
  )
}

function ChangesSummary({ sheet }: { sheet: ImportSheetPreview }) {
  const { changes } = sheet
  const items = [
    { label: 'Нових зустрічей', value: changes.newMeetings },
    { label: 'Нових записів відвідуваності', value: changes.newAttendanceRecords },
    { label: 'Оновлено записів', value: changes.updatedAttendanceRecords },
    { label: 'Скасовано зустрічей', value: changes.cancelledMeetings },
  ].filter((x) => x.value > 0)

  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 12, padding: '8px 10px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#0369A1', marginBottom: 4 }}>Що буде застосовано</div>
      {items.map((x) => (
        <div key={x.label} style={{ fontSize: 12, color: '#0C4A6E', display: 'flex', justifyContent: 'space-between' }}>
          <span>{x.label}</span>
          <strong>{x.value}</strong>
        </div>
      ))}
    </div>
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
    cancellation: 'Скасування зустрічі',
    guests: 'Кількість гостей',
    notes: 'Нотатки',
  }

  return (
    <div style={{ marginBottom: 12, padding: '10px 12px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
        Конфлікти ({props.conflicts.length})
      </div>
      <div style={{ fontSize: 11, color: '#78350F', marginBottom: 10 }}>
        За замовч. береться значення з файлу. Можна явно вибрати «з БД».
      </div>

      {Object.entries(grouped).map(([type, conflicts]) => (
        <div key={type} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{labels[type] || type} ({conflicts.length})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={miniBtnStyle} onClick={() => setAllOfType(type, true)}>Всі з файлу</button>
              <button style={miniBtnStyle} onClick={() => setAllOfType(type, false)}>Всі з БД</button>
            </div>
          </div>

          {conflicts.map((c, i) => {
            const r = resolutionFor(c)
            return (
              <div key={i} style={{ fontSize: 12, padding: '6px 0', borderTop: '1px dashed #FDE68A' }}>
                <div style={{ marginBottom: 4 }}>
                  <strong>{c.date}</strong>
                  {c.personName && <span style={{ color: 'var(--color-text-secondary)' }}> · {c.personName}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                  <button
                    onClick={() => setOne(c, true)}
                    style={pillBtnStyle(r === true)}
                  >
                    Файл: <strong>{c.fileValue}</strong>
                  </button>
                  <button
                    onClick={() => setOne(c, false)}
                    style={pillBtnStyle(r === false)}
                  >
                    БД: <strong>{c.dbValue}</strong>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
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
    <div>
      {unmatched.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={sectionLabelStyle}>Невпізнано ({unmatched.length})</div>
          {unmatched.map((p) => (
            <UnmatchedPersonRow
              key={p.rowIndex}
              person={p}
              decision={decisionFor(p.rowIndex)!}
              onUpdate={(patch) => update(p.rowIndex, patch)}
            />
          ))}
        </div>
      )}

      {matched.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            Знайдено в системі ({matched.length})
          </summary>
          <div style={{ paddingTop: 8 }}>
            {matched.map((p) => (
              <MatchedPersonRow
                key={p.rowIndex}
                person={p}
                decision={decisionFor(p.rowIndex)!}
                onUpdate={(patch) => update(p.rowIndex, patch)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function MatchedPersonRow(props: {
  person: ImportPersonPreview
  decision: PersonDecision
  onUpdate: (patch: Partial<PersonDecision>) => void
}) {
  const { person, decision } = props
  const fullName = [person.lastName, person.name].filter(Boolean).join(' ') || person.name
  const skip = decision.action === 'skip'
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--color-border-light)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: skip ? 'var(--color-text-tertiary)' : 'var(--color-text)', textDecoration: skip ? 'line-through' : 'none' }}>
          {fullName}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
          ✓ {person.filePresentCount} · ✗ {person.fileAbsentCount}
          {person.matchType === 'by_id' && ' · знайдено по ID'}
          {person.matchType === 'by_name' && ' · знайдено по імені'}
          {person.detectedLeftAt && ` · вихід ${person.detectedLeftAt}`}
        </div>
      </div>
      <Switch
        checked={!skip}
        onChange={(v) => props.onUpdate({ action: v ? 'use' : 'skip' })}
      />
    </div>
  )
}

function UnmatchedPersonRow(props: {
  person: ImportPersonPreview
  decision: PersonDecision
  onUpdate: (patch: Partial<PersonDecision>) => void
}) {
  const { person, decision } = props
  const fullName = [person.lastName, person.name].filter(Boolean).join(' ') || person.name

  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{fullName}</div>
      <Selector
        value={[decision.action]}
        columns={3}
        options={[
          { label: 'Пропустити', value: 'skip' },
          { label: 'Створити', value: 'create' },
          { label: 'Прив\'язати', value: 'link' },
        ]}
        onChange={(arr) => {
          const action = (arr[0] || 'skip') as PersonDecision['action']
          props.onUpdate({
            action,
            targetPersonId: action === 'link' ? decision.targetPersonId : null,
            targetUserId: action === 'link' ? decision.targetUserId : null,
          })
        }}
      />

      {decision.action === 'link' && person.suggestions.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <select
            value={`${decision.targetPersonId || ''}|${decision.targetUserId || ''}`}
            onChange={(e) => {
              const [pId, uId] = e.target.value.split('|')
              props.onUpdate({
                targetPersonId: pId ? Number(pId) : null,
                targetUserId: uId ? Number(uId) : null,
              })
            }}
            style={selectStyle}
          >
            <option value="|">— виберіть —</option>
            {person.suggestions.map((s, i) => {
              const val = `${s.personId || ''}|${s.userId || ''}`
              const name = [s.lastName, s.name].filter(Boolean).join(' ')
              const tag = s.isAdmin ? ' (адмін)' : ''
              const grp = s.primaryGroupName ? ` — ${s.primaryGroupName}` : ''
              return <option key={i} value={val}>{name}{tag}{grp}</option>
            })}
          </select>
        </div>
      )}

      {decision.action === 'link' && person.suggestions.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Не знайдено схожих імен в системі — створіть нову людину
        </div>
      )}

      {decision.action === 'create' && (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Створимо нову людину «{fullName}» в обраній групі
        </div>
      )}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

function hasContent(sheet: ImportSheetPreview | undefined): boolean {
  if (!sheet) return false
  return sheet.people.length > 0 || sheet.dates.length > 0
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  borderBottom: '1px solid var(--color-border-light)',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  display: 'flex',
}

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  padding: '12px 16px',
  borderTop: '1px solid var(--color-border-light)',
  background: '#fff',
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 16,
  background: '#F9FAFB',
  border: '1px solid var(--color-border-light)',
  borderRadius: 12,
  cursor: 'pointer',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: 8,
}

function selectableRow(selected: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 4px',
    cursor: 'pointer',
    background: selected ? 'rgba(42, 175, 202, 0.05)' : 'transparent',
    borderRadius: 6,
  }
}

const dateInputStyle: React.CSSProperties = {
  flex: 1,
  border: '1.5px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  outline: 'none',
  fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  background: '#fff',
  color: 'var(--color-text)',
  outline: 'none',
  fontFamily: 'inherit',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--color-border-light)',
  borderRadius: 10,
  overflow: 'hidden',
}

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: 12,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
}

const miniBtnStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '4px 8px',
  background: '#fff',
  border: '1px solid #D97706',
  color: '#D97706',
  borderRadius: 4,
  cursor: 'pointer',
}

function pillBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '6px 10px',
    fontSize: 11,
    background: active ? 'var(--color-primary)' : '#fff',
    color: active ? '#fff' : 'var(--color-text)',
    border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
  }
}
