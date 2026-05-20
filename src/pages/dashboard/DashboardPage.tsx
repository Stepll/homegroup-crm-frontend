import { useIsDesktop } from '@/hooks/useIsDesktop'
import { DashboardPageMobile } from './DashboardPage.mobile'
import { DashboardPageDesktop } from './DashboardPage.desktop'

export function DashboardPage() {
  return useIsDesktop() ? <DashboardPageDesktop /> : <DashboardPageMobile />
}
