import { useIsDesktop } from '@/hooks/useIsDesktop'
import { GroupCabinetPageMobile } from './GroupCabinetPage.mobile'
import { GroupCabinetPageDesktop } from './GroupCabinetPage.desktop'

export function GroupCabinetPage() {
  return useIsDesktop() ? <GroupCabinetPageDesktop /> : <GroupCabinetPageMobile />
}
