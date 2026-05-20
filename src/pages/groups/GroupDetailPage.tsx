import { useIsDesktop } from '@/hooks/useIsDesktop'
import { GroupDetailPageMobile } from './GroupDetailPage.mobile'
import { GroupDetailPageDesktop } from './GroupDetailPage.desktop'
export function GroupDetailPage() {
  return useIsDesktop() ? <GroupDetailPageDesktop /> : <GroupDetailPageMobile />
}
