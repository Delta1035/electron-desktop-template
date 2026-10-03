; Included through build/generated/installer.nsh, which defines APP_INSTALL_DIR_NAME from
; app.config.json (projectName). Do not include this file directly.
!ifndef APP_INSTALL_DIR_NAME
  !error "APP_INSTALL_DIR_NAME is not defined; package with electron-builder.config.mjs"
!endif

; Keep electron-builder's install mode, registry, uninstall and updater handling.
; Only normalize newly selected destinations; an existing installation is exact.
!macro customPageAfterChangeDir
  ; The native directory page has already been skipped. Keep upstream shortcut
  ; relocation handling enabled for our custom directory selection instead.
  !define allowToChangeInstallationDirectory
  Page custom AppDirectoryShow AppDirectoryLeave
  !define MUI_PAGE_CUSTOMFUNCTION_PRE AppInstFilesPre

  Function AppInstFilesPre
    Call AppNormalizeInstallDir
  FunctionEnd
!macroend

!macro customInit
  ; Silent installs do not run page callbacks. Updates retain their saved path.
  ${If} ${Silent}
    Call AppNormalizeInstallDir
  ${EndIf}
!macroend

!macro customHeader
  !ifndef BUILD_UNINSTALLER
    !include nsDialogs.nsh
    Var AppDirectoryInput
    Var AppDirectoryPreview

    Function AppDirectoryShow
      ${If} ${isUpdated}
        Abort
      ${EndIf}
      !insertmacro MUI_HEADER_TEXT "安装目录 / Install location" "选择位置后自动创建 ${APP_INSTALL_DIR_NAME} 文件夹 / Creates a ${APP_INSTALL_DIR_NAME} subfolder"
      nsDialogs::Create 1018
      Pop $0
      ${If} $0 == error
        Abort
      ${EndIf}
      ${NSD_CreateLabel} 0 0 100% 30u "请选择安装位置。已有安装保留原目录。$\r$\nExisting installations keep their location."
      Pop $0
      ${NSD_CreateDirRequest} 0 40u 78% 14u "$INSTDIR"
      Pop $AppDirectoryInput
      ${NSD_OnChange} $AppDirectoryInput AppDirectoryChanged
      ${NSD_CreateBrowseButton} 80% 40u 20% 14u "浏览 / Browse"
      Pop $0
      ${NSD_OnClick} $0 AppDirectoryBrowse
      ${NSD_CreateLabel} 0 70u 100% 45u ""
      Pop $AppDirectoryPreview
      Push 0
      Call AppDirectoryChanged
      nsDialogs::Show
    FunctionEnd

    Function AppDirectoryChanged
      Pop $0
      Push $INSTDIR
      ${NSD_GetText} $AppDirectoryInput $INSTDIR
      Call AppNormalizeInstallDir
      ${NSD_SetText} $AppDirectoryPreview "最终安装目录 / Destination:$\r$\n$INSTDIR"
      Pop $INSTDIR
    FunctionEnd

    Function AppDirectoryBrowse
      Pop $0
      ${NSD_GetText} $AppDirectoryInput $0
      nsDialogs::SelectFolderDialog "安装目录 / Install location" "$0"
      Pop $0
      ${If} $0 != error
        Push $INSTDIR
        StrCpy $INSTDIR $0
        Call AppNormalizeInstallDir
        ${NSD_SetText} $AppDirectoryInput "$INSTDIR"
        Pop $INSTDIR
      ${EndIf}
    FunctionEnd

    Function AppDirectoryLeave
      ${NSD_GetText} $AppDirectoryInput $0
      ${If} $0 == ""
        MessageBox MB_OK "请选择安装目录 / Please choose an install location."
        Abort
      ${EndIf}
      ; Reject relative paths, retaining the native directory page's absolute-path rule.
      StrCpy $1 $0 2
      StrCpy $2 $0 1 1
      StrCpy $3 $0 1 2
      ${If} $1 != "\\"
        ${If} $2 != ":"
          MessageBox MB_OK "请输入绝对路径 / Please enter an absolute path."
          Abort
        ${EndIf}
        ${If} $3 != "\"
        ${AndIf} $3 != "/"
          MessageBox MB_OK "请输入绝对路径 / Please enter an absolute path."
          Abort
        ${EndIf}
      ${EndIf}
      StrCpy $INSTDIR $0
      Call AppNormalizeInstallDir
    FunctionEnd

    Function AppNormalizeInstallDir
      Push $0
      Push $1
      ReadRegStr $0 SHCTX "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $0 != ""
      ${AndIf} $INSTDIR == $0
        ; Existing install locations must survive upgrades unchanged.
      ${Else}
        ; Remove trailing separators, including repeated ones, before checking.
        ${Do}
          StrCpy $1 $INSTDIR 1 -1
          ${If} $1 != "\"
          ${AndIf} $1 != "/"
            ${Break}
          ${EndIf}
          StrCpy $INSTDIR $INSTDIR -1
        ${Loop}
        ${GetFileName} "$INSTDIR" $1
        ; NSIS StrCmp (used by LogicLib) is case insensitive on Windows.
        ${If} $1 != "${APP_INSTALL_DIR_NAME}"
          StrCpy $INSTDIR "$INSTDIR\${APP_INSTALL_DIR_NAME}"
        ${EndIf}
      ${EndIf}
      Pop $1
      Pop $0
      ClearErrors
    FunctionEnd
  !endif
!macroend
