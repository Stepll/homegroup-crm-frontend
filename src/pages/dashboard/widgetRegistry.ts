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
    id: 'myTasks',
    label: 'Мої задачі',
    description: 'Задачі які назначені тобі у профілі',
  },
  {
    id: 'myOversight',
    label: 'Мої підопічні',
    description: 'Люди під твоєю опікою з відвідуваністю',
  },
  {
    id: 'inactiveMembers',
    label: 'Давно не ходять',
    description: 'Люди з 5+ пропущеними зустрічами за останні 6 місяців',
  },
  {
    id: 'groupsComparison',
    label: 'Порівняння домашок',
    description: 'Графік відвідуваності кількох домашок поряд',
  },
  {
    id: 'statusDistribution',
    label: 'Статуси людей',
    description: 'Кругова діаграма розподілу людей по статусу',
  },
  {
    id: 'groupsAttendanceSummary',
    label: 'Відвідуваність по домашках',
    description: 'Кількість людей і середня відвідуваність за 1/3/6 міс',
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
  {
    id: 'randomNeed',
    label: 'Молитовна потреба',
    description: 'Випадкова активна потреба з можливістю змінити статус',
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
