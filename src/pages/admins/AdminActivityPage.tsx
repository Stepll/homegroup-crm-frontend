import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AdminActivityPageMobile } from './AdminActivityPage.mobile'
import { AdminActivityPageDesktop } from './AdminActivityPage.desktop'

export function AdminActivityPage() {
  return useIsDesktop() ? <AdminActivityPageDesktop /> : <AdminActivityPageMobile />
}
