import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PersonStatusesPageMobile } from './PersonStatusesPage.mobile'
import { PersonStatusesPageDesktop } from './PersonStatusesPage.desktop'

export function PersonStatusesPage() {
  return useIsDesktop() ? <PersonStatusesPageDesktop /> : <PersonStatusesPageMobile />
}
