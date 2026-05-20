import { useIsDesktop } from '@/hooks/useIsDesktop'
import { CalendarPageMobile } from './CalendarPage.mobile'
import { CalendarPageDesktop } from './CalendarPage.desktop'

export function CalendarPage() {
  return useIsDesktop() ? <CalendarPageDesktop /> : <CalendarPageMobile />
}
