@echo off
title Sistema Checador - Sor Juana Ines de la Cruz
cd /d "%~dp0"

echo ========================================================
echo   Iniciando Sistema Checador Escolar
echo   Escuela Primaria Sor Juana Ines de la Cruz T.V
echo ========================================================
echo.

if not exist "node_modules\vite\" (
    echo [1/3] Instalando dependencias por primera vez...
    echo Esto puede tardar varios minutos y requerir internet.
    call npm install
)

if not exist "dist\" (
    echo.
    echo [2/3] Construyendo el sistema por primera vez...
    call npm run build
) else (
    echo [2/3] Sistema ya compilado, omitiendo reconstruccion...
)

echo.
echo [3/3] Iniciando el servidor local...
echo El navegador se abrira automaticamente.
echo Para apagar el sistema simplemente cierre esta ventana.
echo.
call npx --yes vite preview --open

echo.
echo Si estas leyendo esto es porque ocurrio un error y el servidor se detuvo.
pause
