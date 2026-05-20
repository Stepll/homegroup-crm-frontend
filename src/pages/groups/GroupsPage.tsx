import { useIsDesktop } from '@/hooks/useIsDesktop'
import { GroupsPageMobile } from './GroupsPage.mobile'
import { GroupsPageDesktop } from './GroupsPage.desktop'
export function GroupsPage() {
  return useIsDesktop() ? <GroupsPageDesktop /> : <GroupsPageMobile />
}
