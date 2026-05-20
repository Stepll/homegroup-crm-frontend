import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PeoplePageMobile } from './PeoplePage.mobile'
import { PeoplePageDesktop } from './PeoplePage.desktop'

export function PeoplePage() {
  return useIsDesktop() ? <PeoplePageDesktop /> : <PeoplePageMobile />
}
