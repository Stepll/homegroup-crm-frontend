import { useIsDesktop } from '@/hooks/useIsDesktop'
import { StatsPageMobile } from './StatsPage.mobile'
import { StatsPageDesktop } from './StatsPage.desktop'
export function StatsPage() {
  return useIsDesktop() ? <StatsPageDesktop /> : <StatsPageMobile />
}
