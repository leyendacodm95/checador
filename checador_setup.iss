[Setup]
AppName=Sistema Checador Sor Juana Inés de la Cruz
AppVersion=1.0
AppPublisher=Escuela Primaria Sor Juana Inés de la Cruz
DefaultDirName={pf}\ChecadorEscolar
DefaultGroupName=Checador Escolar
OutputDir=Output
OutputBaseFilename=Instalador_Checador_Escolar
SetupIconFile=logo.ico
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*, .git\*, Output\*, checador_setup.iss"

[Icons]
Name: "{commondesktop}\Sistema Checador"; Filename: "{app}\Iniciar_Checador.bat"; IconFilename: "{app}\logo.ico"; Tasks: desktopicon
Name: "{group}\Sistema Checador"; Filename: "{app}\Iniciar_Checador.bat"; IconFilename: "{app}\logo.ico"
Name: "{group}\Desinstalar Checador"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\Iniciar_Checador.bat"; Description: "{cm:LaunchProgram,Sistema Checador}"; Flags: shellexec postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var
  ErrorCode: Integer;
begin
  Result := True;
end;
