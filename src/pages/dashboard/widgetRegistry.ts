export interface WidgetDef {
  id: string
  label: string
  description: string
}

export const ALL_WIDGETS: WidgetDef[] = [
  {
    id: 'attendance',
    label: 'Відмітити присутніх',
    description: 'Відмітити відвідуваність на зустрічі групи',
  },
]

export interface WidgetConfig {
  id: string
  enabled: boolean
}

const STORAGE_KEY_PREFIX = 'dashboard_widgets_'

export function loadWidgetConfig(userEmail: string): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userEmail)
    if (raw) {
      const saved: WidgetConfig[] = JSON.parse(raw)
      const newWidgets = ALL_WIDGETS
        .filter((w) => !saved.find((s) => s.id === w.id))
        .map((w) => ({ id: w.id, enabled: true }))
      return [...saved, ...newWidgets]
    }
  } catch {}
  return ALL_WIDGETS.map((w) => ({ id: w.id, enabled: true }))
}

export function saveWidgetConfig(userEmail: string, config: WidgetConfig[]) {
  localStorage.setItem(STORAGE_KEY_PREFIX + userEmail, JSON.stringify(config))
}
