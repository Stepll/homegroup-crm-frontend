import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PersonActivityPageMobile } from './PersonActivityPage.mobile'
import { PersonActivityPageDesktop } from './PersonActivityPage.desktop'
export function PersonActivityPage() {
  return useIsDesktop() ? <PersonActivityPageDesktop /> : <PersonActivityPageMobile />
}
