import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AttendancePageMobile } from './AttendancePage.mobile'
import { AttendancePageDesktop } from './AttendancePage.desktop'
export function AttendancePage() {
  return useIsDesktop() ? <AttendancePageDesktop /> : <AttendancePageMobile />
}
