import { useIsDesktop } from '@/hooks/useIsDesktop'
import { ChurchServicesPageMobile } from './ChurchServicesPage.mobile'
import { ChurchServicesPageDesktop } from './ChurchServicesPage.desktop'

export function ChurchServicesPage() {
  return useIsDesktop() ? <ChurchServicesPageDesktop /> : <ChurchServicesPageMobile />
}
