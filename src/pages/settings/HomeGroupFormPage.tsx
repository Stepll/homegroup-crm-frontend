import { useIsDesktop } from '@/hooks/useIsDesktop'
import { HomeGroupFormPageMobile } from './HomeGroupFormPage.mobile'
import { HomeGroupFormPageDesktop } from './HomeGroupFormPage.desktop'

export function HomeGroupFormPage() {
  return useIsDesktop() ? <HomeGroupFormPageDesktop /> : <HomeGroupFormPageMobile />
}
