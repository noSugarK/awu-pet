; Awu Pet used to be called YierBubu-Pet, which installed under its own name. Remove that copy first so the
; two don't sit side by side (both share one identifier, so the old one would also swallow the new one's launch).
!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\YierBubu-Pet" "UninstallString"
  StrCmp $0 "" done
    nsExec::Exec 'taskkill /IM YierBubu-Pet.exe /F'
    ExecWait '$0 /S'
  done:
!macroend
