import { useIsDesktop } from '@/hooks/useIsDesktop'
import { RoleFormPageMobile } from './RoleFormPage.mobile'
import { RoleFormPageDesktop } from './RoleFormPage.desktop'

export function RoleFormPage() {
  return useIsDesktop() ? <RoleFormPageDesktop /> : <RoleFormPageMobile />
}
