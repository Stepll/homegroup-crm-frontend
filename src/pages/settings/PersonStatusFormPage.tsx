import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PersonStatusFormPageMobile } from './PersonStatusFormPage.mobile'
import { PersonStatusFormPageDesktop } from './PersonStatusFormPage.desktop'

export function PersonStatusFormPage() {
  return useIsDesktop() ? <PersonStatusFormPageDesktop /> : <PersonStatusFormPageMobile />
}
