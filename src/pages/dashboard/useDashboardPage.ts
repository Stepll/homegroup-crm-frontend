import { useEffect, useState } from 'react'
import { adminsApi } from '@/api/admins'
import { mergeWithDefaults, defaultConfig } from './widgetRegistry'
import type { WidgetConfig } from './widgetRegistry'

export function useDashboardPage() {
  const [config, setConfig] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminsApi.getDashboardConfig()
      .then((saved) => setConfig(saved.length > 0 ? mergeWithDefaults(saved) : defaultConfig()))
      .catch(() => setConfig(defaultConfig()))
      .finally(() => setLoading(false))
  }, [])

  return { enabledWidgets: config.filter((w) => w.enabled), loading }
}
