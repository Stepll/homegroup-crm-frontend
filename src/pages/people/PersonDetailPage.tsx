import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PersonDetailPageMobile } from './PersonDetailPage.mobile'
import { PersonDetailPageDesktop } from './PersonDetailPage.desktop'
export function PersonDetailPage() {
  return useIsDesktop() ? <PersonDetailPageDesktop /> : <PersonDetailPageMobile />
}
