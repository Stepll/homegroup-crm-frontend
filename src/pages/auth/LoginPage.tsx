import { useIsDesktop } from '@/hooks/useIsDesktop'
import { LoginPageMobile } from './LoginPage.mobile'
import { LoginPageDesktop } from './LoginPage.desktop'
export function LoginPage() {
  return useIsDesktop() ? <LoginPageDesktop /> : <LoginPageMobile />
}
