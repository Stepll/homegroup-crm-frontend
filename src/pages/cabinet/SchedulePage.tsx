import { useIsDesktop } from '@/hooks/useIsDesktop'
import { SchedulePageMobile } from './SchedulePage.mobile'
import { SchedulePageDesktop } from './SchedulePage.desktop'
export function SchedulePage() {
  return useIsDesktop() ? <SchedulePageDesktop /> : <SchedulePageMobile />
}
