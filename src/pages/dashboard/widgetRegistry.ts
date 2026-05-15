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

export function mergeWithDefaults(saved: WidgetConfig[]): WidgetConfig[] {
  const newWidgets = ALL_WIDGETS
    .filter((w) => !saved.find((s) => s.id === w.id))
    .map((w) => ({ id: w.id, enabled: true }))
  return [...saved, ...newWidgets]
}

export function defaultConfig(): WidgetConfig[] {
  return ALL_WIDGETS.map((w) => ({ id: w.id, enabled: true }))
}
