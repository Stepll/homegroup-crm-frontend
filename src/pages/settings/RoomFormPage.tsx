import { useIsDesktop } from '@/hooks/useIsDesktop'
import { RoomFormPageMobile } from './RoomFormPage.mobile'
import { RoomFormPageDesktop } from './RoomFormPage.desktop'

export function RoomFormPage() {
  return useIsDesktop() ? <RoomFormPageDesktop /> : <RoomFormPageMobile />
}
