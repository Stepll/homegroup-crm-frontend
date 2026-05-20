import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AdminsPageMobile } from './AdminsPage.mobile'
import { AdminsPageDesktop } from './AdminsPage.desktop'

export function AdminsPage() {
  return useIsDesktop() ? <AdminsPageDesktop /> : <AdminsPageMobile />
}
