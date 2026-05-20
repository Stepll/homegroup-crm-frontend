import { useIsDesktop } from '@/hooks/useIsDesktop'
import { HomeGroupsSettingsPageMobile } from './HomeGroupsSettingsPage.mobile'
import { HomeGroupsSettingsPageDesktop } from './HomeGroupsSettingsPage.desktop'

export function HomeGroupsSettingsPage() {
  return useIsDesktop() ? <HomeGroupsSettingsPageDesktop /> : <HomeGroupsSettingsPageMobile />
}
