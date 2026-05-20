import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AdminCreatePageMobile } from './AdminCreatePage.mobile'
import { AdminCreatePageDesktop } from './AdminCreatePage.desktop'

export function AdminCreatePage() {
  return useIsDesktop() ? <AdminCreatePageDesktop /> : <AdminCreatePageMobile />
}
