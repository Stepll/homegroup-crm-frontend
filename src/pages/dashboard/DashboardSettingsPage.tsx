import { useIsDesktop } from '@/hooks/useIsDesktop'
import { DashboardSettingsPageMobile } from './DashboardSettingsPage.mobile'
import { DashboardSettingsPageDesktop } from './DashboardSettingsPage.desktop'
export function DashboardSettingsPage() {
  return useIsDesktop() ? <DashboardSettingsPageDesktop /> : <DashboardSettingsPageMobile />
}
