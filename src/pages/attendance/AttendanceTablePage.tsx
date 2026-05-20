import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AttendanceTablePageMobile } from './AttendanceTablePage.mobile'
import { AttendanceTablePageDesktop } from './AttendanceTablePage.desktop'
export function AttendanceTablePage() {
  return useIsDesktop() ? <AttendanceTablePageDesktop /> : <AttendanceTablePageMobile />
}
