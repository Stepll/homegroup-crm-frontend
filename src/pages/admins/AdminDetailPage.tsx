import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AdminDetailPageMobile } from './AdminDetailPage.mobile'
import { AdminDetailPageDesktop } from './AdminDetailPage.desktop'

export function AdminDetailPage() {
  return useIsDesktop() ? <AdminDetailPageDesktop /> : <AdminDetailPageMobile />
}
