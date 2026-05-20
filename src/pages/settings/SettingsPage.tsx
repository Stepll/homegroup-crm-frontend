import { useIsDesktop } from '@/hooks/useIsDesktop'
import { SettingsPageMobile } from './SettingsPage.mobile'
import { SettingsPageDesktop } from './SettingsPage.desktop'

export function SettingsPage() {
  return useIsDesktop() ? <SettingsPageDesktop /> : <SettingsPageMobile />
}
