import { useIsDesktop } from '@/hooks/useIsDesktop'
import { ProfilePageMobile } from './ProfilePage.mobile'
import { ProfilePageDesktop } from './ProfilePage.desktop'

export function ProfilePage() {
  return useIsDesktop() ? <ProfilePageDesktop /> : <ProfilePageMobile />
}
