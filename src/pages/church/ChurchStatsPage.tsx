import { useIsDesktop } from '@/hooks/useIsDesktop'
import { ChurchStatsPageMobile } from './ChurchStatsPage.mobile'
import { ChurchStatsPageDesktop } from './ChurchStatsPage.desktop'

export function ChurchStatsPage() {
  return useIsDesktop() ? <ChurchStatsPageDesktop /> : <ChurchStatsPageMobile />
}
