import { useIsDesktop } from '@/hooks/useIsDesktop'
import { RolesSettingsPageMobile } from './RolesSettingsPage.mobile'
import { RolesSettingsPageDesktop } from './RolesSettingsPage.desktop'

export function RolesSettingsPage() {
  return useIsDesktop() ? <RolesSettingsPageDesktop /> : <RolesSettingsPageMobile />
}
