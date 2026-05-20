import { useIsDesktop } from '@/hooks/useIsDesktop'
import { RoomsSettingsPageMobile } from './RoomsSettingsPage.mobile'
import { RoomsSettingsPageDesktop } from './RoomsSettingsPage.desktop'

export function RoomsSettingsPage() {
  return useIsDesktop() ? <RoomsSettingsPageDesktop /> : <RoomsSettingsPageMobile />
}
