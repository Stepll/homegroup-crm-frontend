import { useIsDesktop } from '@/hooks/useIsDesktop'
import { PlanningPageMobile } from './PlanningPage.mobile'
import { PlanningPageDesktop } from './PlanningPage.desktop'
export function PlanningPage() {
  return useIsDesktop() ? <PlanningPageDesktop /> : <PlanningPageMobile />
}
