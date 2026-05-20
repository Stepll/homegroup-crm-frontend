import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AdminProfilePageMobile } from './AdminProfilePage.mobile'
import { AdminProfilePageDesktop } from './AdminProfilePage.desktop'

export function AdminProfilePage() {
  return useIsDesktop() ? <AdminProfilePageDesktop /> : <AdminProfilePageMobile />
}
