[Setup]
AppName=Sistema Checador Sor Juana Ines de la Cruz
AppVersion=1.2
AppPublisher=Escuela Primaria Sor Juana Ines de la Cruz
DefaultDirName={localappdata}\ChecadorEscolar
DefaultGroupName=Checador Escolar
OutputDir=Output
OutputBaseFilename=Instalador_Checador_Escolar
SetupIconFile=logo.ico
UninstallDisplayIcon={app}\logo.ico
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules, .git, .vscode, Output, scratch, native_app, Versiones APK, Proyectos a incorporar, Datos Checador Primaria, checador_setup.iss, Funciones_Del_Sistema_Checador.xlsx, probador_de_temas.html, *preview*.html, build_and_open.bat, Compilar.bat"

[Icons]
Name: "{commondesktop}\Sistema Checador"; Filename: "{app}\Iniciar_Checador.bat"; WorkingDir: "{app}"; IconFilename: "{app}\logo.ico"; Tasks: desktopicon; Flags: runminimized
Name: "{group}\Sistema Checador"; Filename: "{app}\Iniciar_Checador.bat"; WorkingDir: "{app}"; IconFilename: "{app}\logo.ico"; Flags: runminimized
Name: "{group}\Desinstalar Checador"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\Iniciar_Checador.bat"; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,Sistema Checador}"; Flags: shellexec postinstall skipifsilent runminimized

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\dist"
Type: filesandordirs; Name: "{app}\*"
Type: dirifempty; Name: "{app}"

[Code]
function InitializeSetup(): Boolean;
var
  ErrorCode: Integer;
begin
  Result := True;
end;
