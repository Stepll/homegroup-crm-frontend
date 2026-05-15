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
  {
    id: 'groupStats',
    label: 'Відвідуваність домашок',
    description: 'Статистика відвідуваності по домашці або всіх групах',
  },
  {
    id: 'upcomingEvents',
    label: 'Найближчі події',
    description: 'Дні народження та події твоєї домашки',
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
