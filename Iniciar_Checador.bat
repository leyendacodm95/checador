@echo off
title Sistema Checador - Sor Juana Ines de la Cruz
echo ========================================================
echo   Iniciando Sistema Checador Escolar
echo   Escuela Primaria Sor Juana Ines de la Cruz T.V
echo ========================================================
echo.

if not exist "node_modules\" (
    echo [1/3] Instalando dependencias por primera vez (esto puede tardar unos minutos)...
    call npm install
)

echo [2/3] Verificando compilacion del proyecto...
call npm run build

echo [3/3] Iniciando el servidor local...
echo El navegador se abrira automaticamente en unos segundos.
echo Para apagar el sistema simplemente cierre esta ventana.
echo.
call npx vite preview --open
