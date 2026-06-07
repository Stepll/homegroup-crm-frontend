import { useIsDesktop } from '@/hooks/useIsDesktop'
import { AttendanceImportExportPopupMobile } from './AttendanceImportExportPopup.mobile'
import { AttendanceImportExportPopupDesktop } from './AttendanceImportExportPopup.desktop'

interface Props {
  visible: boolean
  onClose: () => void
  defaultGroupId?: number
  onImported?: () => void
}

export function AttendanceImportExportPopup(props: Props) {
  return useIsDesktop()
    ? <AttendanceImportExportPopupDesktop {...props} />
    : <AttendanceImportExportPopupMobile {...props} />
}
