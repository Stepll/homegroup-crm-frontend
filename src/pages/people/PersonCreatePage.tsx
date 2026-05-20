import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PersonCreatePageMobile } from './PersonCreatePage.mobile'
import { PersonCreatePageDesktop } from './PersonCreatePage.desktop'
export function PersonCreatePage() {
  return useIsDesktop() ? <PersonCreatePageDesktop /> : <PersonCreatePageMobile />
}
