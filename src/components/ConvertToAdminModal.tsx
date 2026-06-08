import { useEffect, useMemo, useState } from 'react'
import { Modal, Input, Select, Spin, Typography, Tag, Alert } from 'antd'
import { peopleApi, type ConvertToAdminPreview } from '@/api/people'
import { rolesApi, type Role } from '@/api/roles'
import { groupsApi } from '@/api/groups'
import type { Group } from '@/types'

const { Text } = Typography

type Props = {
  open: boolean
  personId: number
  personName: string
  onSuccess: (newAdminId: number) => void
  onCancel: () => void
}

export function ConvertToAdminModal({ open, personId, personName, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<ConvertToAdminPreview | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleIds, setRoleIds] = useState<number[]>([])
  const [primaryGroupId, setPrimaryGroupId] = useState<number | null>(null)
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    Promise.all([
      peopleApi.convertPreview(personId),
      rolesApi.getAll(),
      groupsApi.getAll(),
    ])
      .then(([p, rs, gs]) => {
        setPreview(p)
        setRoles(rs)
        setGroups(gs)
        setEmail(p.emailAvailable ? (p.email ?? '') : '')
        setPrimaryGroupId(p.primaryGroupId ?? null)
        setVisibleGroupIds(p.primaryGroupId ? [p.primaryGroupId] : [])
        const defaultRole = rs.find((r) => r.isDefault) ?? rs.find((r) => !r.isSystem)
        if (defaultRole) setRoleIds([defaultRole.id])
      })
      .catch(() => setError('Не вдалося завантажити дані'))
      .finally(() => setLoading(false))
  }, [open, personId])

  const emailTaken = useMemo(() => {
    if (!preview) return false
    return !preview.emailAvailable && email.trim().toLowerCase() === (preview.email ?? '').toLowerCase()
  }, [preview, email])

  const handleSubmit = async () => {
    setError(null)
    if (!email.trim()) { setError("Введіть email"); return }
    if (password.length < 6) { setError('Пароль мінімум 6 символів'); return }
    if (roleIds.length === 0) { setError('Виберіть хоча б одну роль'); return }
    setSaving(true)
    try {
      const newId = await peopleApi.convertToAdmin(personId, {
        email: email.trim(), password,
        roleIds, primaryGroupId, visibleGroupIds,
      })
      onSuccess(newId)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Помилка конвертації')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`Перевести в адміни: ${personName}`}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Перевести"
      cancelText="Скасувати"
      okButtonProps={{ disabled: loading || saving, loading: saving }}
      width={560}
      destroyOnClose
    >
      {loading || !preview ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Alert
            type="info"
            showIcon
            message="Що відбудеться"
            description={
              <div style={{ fontSize: 12 }}>
                <div>• Створиться адмін з даних людини (профіль, статус, дата народження)</div>
                {preview.attendanceCount > 0 && <div>• Перенесеться <b>{preview.attendanceCount}</b> записів відвідуваності</div>}
                {preview.customFieldValueCount > 0 && <div>• Перенесеться <b>{preview.customFieldValueCount}</b> кастомних полів</div>}
                {preview.activityCount > 0 && <div>• Перенесеться <b>{preview.activityCount}</b> записів активності</div>}
                {preview.groupNeedCount > 0 && <div>• Перенесеться <b>{preview.groupNeedCount}</b> запитів молитов</div>}
                {preview.groupMemberHistoryCount > 0 && <div>• Перенесеться <b>{preview.groupMemberHistoryCount}</b> історичних записів членства</div>}
                <div>• Запис людини видалиться, опікун буде втрачено</div>
              </div>
            }
          />

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
              Email <span style={{ color: '#EF4444' }}>*</span>
            </div>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="login@example.com"
              status={emailTaken ? 'error' : undefined}
            />
            {emailTaken && (
              <Text type="danger" style={{ fontSize: 11 }}>
                Цей email уже використовується — введіть інший
              </Text>
            )}
            {preview.email && preview.emailAvailable && (
              <Text type="secondary" style={{ fontSize: 11 }}>З профілю людини</Text>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
              Пароль <span style={{ color: '#EF4444' }}>*</span>
            </div>
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Мінімум 6 символів"
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
              Ролі <span style={{ color: '#EF4444' }}>*</span>
            </div>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Виберіть ролі"
              value={roleIds}
              onChange={setRoleIds}
              optionLabelProp="label"
            >
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id} label={r.name}>
                  <Tag color={r.color} style={{ marginRight: 0 }}>{r.name}</Tag>
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
              Основна група
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="— Без групи —"
              value={primaryGroupId ?? undefined}
              onChange={(v) => setPrimaryGroupId(v ?? null)}
              allowClear
            >
              {groups.map((g) => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
              Видимі групи
            </div>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Які групи бачитиме адмін"
              value={visibleGroupIds}
              onChange={setVisibleGroupIds}
            >
              {groups.map((g) => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </div>

          {error && <Alert type="error" showIcon message={error} />}
        </div>
      )}
    </Modal>
  )
}
