; VoidLink Windows Installer Script
; Built with Inno Setup 6.x — https://jrsoftware.org/isinfo.php
;
; Prerequisites:
;   1. Build VoidLink.exe first:
;      cd voidlink/desktop
;      python icon_gen.py
;      pyinstaller voidlink.spec
;   2. Install Inno Setup 6 from jrsoftware.org
;   3. Open this file in Inno Setup IDE and click Build

#define AppName "VoidLink"
#define AppVersion "1.0.0"
#define AppPublisher "VoidLink"
#define AppURL "https://github.com/CCguvycu/cy"
#define AppExeName "VoidLink.exe"
#define ExeSource "..\desktop\dist\VoidLink.exe"
#define IconSource "..\desktop\icon.ico"

[Setup]
AppId={{8F3A2E1B-9C4D-4F7A-B2E8-1A3F5C7D9E0B}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\VoidLink
DefaultGroupName=VoidLink
AllowNoIcons=yes
LicenseFile=license.txt
OutputDir=.\output
OutputBaseFilename=VoidLink-Setup-{#AppVersion}
SetupIconFile={#IconSource}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\VoidLink.exe
CloseApplications=yes

; Dark-ish wizard colors
WizardImageFile=wizard_banner.bmp
WizardSmallImageFile=wizard_icon.bmp

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Start VoidLink automatically when Windows starts"; GroupDescription: "Startup:"; Flags: checked

[Files]
Source: "{#ExeSource}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\VoidLink"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\VoidLink"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Registry]
; Add to Windows startup if task selected
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "VoidLink"; \
  ValueData: """{app}\VoidLink.exe"""; \
  Flags: uninsdeletevalue; Tasks: startupicon

[Run]
; Launch after install
Filename: "{app}\{#AppExeName}"; \
  Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; \
  Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: dirifempty; Name: "{app}"

[Code]
// Show a friendly page explaining what VoidLink does
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel2.Caption :=
    'VoidLink lets you access your local AI models from your phone — anywhere.' + #13#10 + #13#10 +
    'This installer will:' + #13#10 +
    '  • Install VoidLink in your system tray' + #13#10 +
    '  • Download Ollama (AI engine) automatically if needed' + #13#10 +
    '  • Generate secure credentials for you' + #13#10 +
    '  • Start running immediately after install' + #13#10 + #13#10 +
    'No configuration required.';
end;
